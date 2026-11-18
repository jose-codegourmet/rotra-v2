package session

import (
	"context"
	"crypto/ed25519"
	"crypto/hkdf"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/netip"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

// unknownIP is the counter subject when no client IP is known, so the request still counts somewhere.
const unknownIP = "unknown"

// SignInAttempt is one credential attempt, before the password is checked.
type SignInAttempt struct {
	Audience store.Audience
	// LoginKey is the club username or the player or admin email, as typed: it is trimmed and lowercased here.
	LoginKey string
	// DeviceID is the Queue device id sent with a club sign-in. Optional, and never trusted alone.
	DeviceID *uuid.UUID
	// IP is the trusted client IP: httpapi.ClientIPFrom(ctx), never a header the caller chose.
	IP string
}

// Limiter enforces the sign-in rate limits (B-30, R4) on fixed windows kept in auth_rate_limits.
//
// It is bound to the pool-bound store on purpose: every count commits in its own statement, so a failed
// sign-in whose transaction rolls back still counts (inside it, brute force would never be counted).
// Expired windows are deleted by the request that starts a new window, no job (B-07).
type Limiter struct {
	st        *store.Store
	limits    config.AuthLimits
	key       []byte
	now       func() time.Time
	log       *slog.Logger
	maxWindow time.Duration
}

// NewLimiter builds a Limiter. The login subject is an HMAC keyed by an HKDF derivation of the signing key
// seed, so the table never holds a reversible email; with no signing key it uses a random per-process key
// (counts then restart with the process, which only ever loosens a lockout). A nil clock is time.Now and a
// nil logger discards.
func NewLimiter(st *store.Store, limits config.AuthLimits, signingKey ed25519.PrivateKey, now func() time.Time, log *slog.Logger) (*Limiter, error) {
	if st == nil {
		return nil, errors.New("session: a limiter needs a store")
	}
	maxWindow, err := validateLimits(limits)
	if err != nil {
		return nil, err
	}
	var key []byte
	if signingKey != nil {
		if len(signingKey) != ed25519.PrivateKeySize {
			return nil, errors.New("session: the signing key is not an Ed25519 private key")
		}
		key, err = hkdf.Key(sha256.New, signingKey.Seed(), nil, "rotra auth rate-limit login subject v1", sha256.Size)
		if err != nil {
			return nil, fmt.Errorf("session: deriving the rate-limit key: %w", err)
		}
	} else {
		key = make([]byte, sha256.Size)
		if _, err := io.ReadFull(rand.Reader, key); err != nil {
			return nil, fmt.Errorf("session: reading random bytes: %w", err)
		}
	}
	if now == nil {
		now = time.Now
	}
	if log == nil {
		log = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
	return &Limiter{st: st, limits: limits, key: key, now: now, log: log, maxWindow: maxWindow}, nil
}

// validateLimits checks every limit and returns the longest window.
func validateLimits(l config.AuthLimits) (time.Duration, error) {
	var longest time.Duration
	for name, lim := range map[string]config.AuthLimit{
		"login failures": l.LoginFailures, "device attempts": l.DeviceAttempts, "ip attempts": l.IPAttempts,
		"claim": l.ClaimIP, "reset request": l.ResetRequestIP, "refresh ip": l.RefreshIP, "refresh session": l.RefreshSession,
	} {
		if lim.Max < 1 || lim.Window < time.Second {
			return 0, fmt.Errorf("session: the %s limit needs at least 1 attempt and a window of at least 1s", name)
		}
		longest = max(longest, lim.Window)
	}
	return longest, nil
}

func normalizeLogin(key string) string { return strings.ToLower(strings.TrimSpace(key)) }

// LoginSubject is the auth_rate_limits subject of an account: HMAC-SHA256 of "<audience>:<login_key>" in hex.
func (l *Limiter) LoginSubject(aud store.Audience, loginKey string) string {
	mac := hmac.New(sha256.New, l.key)
	mac.Write([]byte(string(aud) + ":" + normalizeLogin(loginKey)))
	return hex.EncodeToString(mac.Sum(nil))
}

func ipSubject(ip string) string {
	if ip = strings.TrimSpace(ip); ip != "" {
		return ip
	}
	return unknownIP
}

// windowStart floors now to the window.
func windowStart(now time.Time, window time.Duration) time.Time { return now.UTC().Truncate(window) }

// retryAfter is the time left in the window that began at ws.
func retryAfter(now, ws time.Time, window time.Duration) *RateLimitedError {
	return &RateLimitedError{RetryAfter: ws.Add(window).Sub(now)}
}

// count adds one attempt to a counter and returns the count including it and the window's start. The first
// attempt of a new window also deletes the subject's long-expired windows. The cutoff is the longest
// configured window, not this counter's own: DeleteExpiredWindowsFor does not filter by action, and one IP
// subject holds 15 minute sign-in windows next to 1 hour claim windows that must not be pruned early.
func (l *Limiter) count(ctx context.Context, scope store.RateScope, subject string, action store.RateAction, lim config.AuthLimit) (int, time.Time, error) {
	now := l.now()
	ws := windowStart(now, lim.Window)
	n, err := l.st.UpsertAttempt(ctx, scope, subject, action, ws)
	if err != nil {
		return 0, ws, err
	}
	if n == 1 {
		if _, err := l.st.DeleteExpiredWindowsFor(ctx, scope, subject, now.Add(-l.maxWindow)); err != nil {
			l.log.WarnContext(ctx, "pruning expired rate-limit windows failed", slog.String("scope", string(scope)), slog.Any("error", err))
		}
	}
	return n, ws, nil
}

// excess writes the rate_limited event the first time a counter goes over, so a flood writes one row per
// window and not one per request. It never fails the request.
func (l *Limiter) excess(ctx context.Context, a SignInAttempt) {
	ev := store.NewEvent{Audience: a.Audience, Event: store.EventRateLimited, DeviceID: a.DeviceID, At: l.now()}
	if ip, err := netip.ParseAddr(a.IP); err == nil {
		ev.IP = &ip
	}
	if err := l.st.InsertEvent(ctx, ev); err != nil {
		l.log.WarnContext(ctx, "writing the rate_limited event failed", slog.Any("error", err))
	}
}

// BeginSignIn is the first step of a credential sign-in, before any password work. It counts the attempt
// against the client IP and the device (successful or not) and refuses when either is over its limit; it also
// refuses when the account already has too many wrong passwords this window, WITHOUT counting that check.
// A refused attempt returns a *RateLimitedError (errors.Is ErrRateLimited).
//
// The account check is a read followed, later, by RecordWrongPassword's count: parallel attempts can overshoot
// the limit by at most the number in flight, which the Hasher's concurrency cap bounds.
func (l *Limiter) BeginSignIn(ctx context.Context, a SignInAttempt) error {
	now := l.now()
	ip := ipSubject(a.IP)
	n, ws, err := l.count(ctx, store.ScopeIP, ip, store.ActionSignIn, l.limits.IPAttempts)
	if err != nil {
		return err
	}
	if n > l.limits.IPAttempts.Max {
		if n == l.limits.IPAttempts.Max+1 {
			l.excess(ctx, a)
		}
		return retryAfter(now, ws, l.limits.IPAttempts.Window)
	}
	if a.DeviceID != nil {
		n, ws, err = l.count(ctx, store.ScopeDevice, a.DeviceID.String(), store.ActionSignIn, l.limits.DeviceAttempts)
		if err != nil {
			return err
		}
		if n > l.limits.DeviceAttempts.Max {
			if n == l.limits.DeviceAttempts.Max+1 {
				l.excess(ctx, a)
			}
			return retryAfter(now, ws, l.limits.DeviceAttempts.Window)
		}
	}
	lws := windowStart(now, l.limits.LoginFailures.Window)
	failures, err := l.st.AttemptCount(ctx, store.ScopeLogin, l.LoginSubject(a.Audience, a.LoginKey), store.ActionSignIn, lws)
	if err != nil {
		return err
	}
	if failures >= l.limits.LoginFailures.Max {
		return retryAfter(now, lws, l.limits.LoginFailures.Window)
	}
	return nil
}

// RecordWrongPassword counts one wrong password against the account. Call it for every failed credential
// check, an unknown login included (the subject is a hash, so that reveals nothing). The failed sign-in is then
// answered as usual; the lock shows on the next BeginSignIn. It writes one rate_limited event when this failure
// is the one that locks the account.
func (l *Limiter) RecordWrongPassword(ctx context.Context, a SignInAttempt) error {
	n, _, err := l.count(ctx, store.ScopeLogin, l.LoginSubject(a.Audience, a.LoginKey), store.ActionSignIn, l.limits.LoginFailures)
	if err != nil {
		return err
	}
	if n == l.limits.LoginFailures.Max {
		l.excess(ctx, a)
	}
	return nil
}

// checkIP counts one attempt of action against the client IP.
func (l *Limiter) checkIP(ctx context.Context, ip string, action store.RateAction, lim config.AuthLimit) error {
	now := l.now()
	n, ws, err := l.count(ctx, store.ScopeIP, ipSubject(ip), action, lim)
	if err != nil {
		return err
	}
	if n > lim.Max {
		if n == lim.Max+1 {
			l.log.WarnContext(ctx, "rate limit reached", slog.String("action", string(action)))
		}
		return retryAfter(now, ws, lim.Window)
	}
	return nil
}

// CheckClaim counts one claim attempt against the client IP.
func (l *Limiter) CheckClaim(ctx context.Context, ip string) error {
	return l.checkIP(ctx, ip, store.ActionClaim, l.limits.ClaimIP)
}

// CheckResetRequest counts one password reset request against the client IP.
func (l *Limiter) CheckResetRequest(ctx context.Context, ip string) error {
	return l.checkIP(ctx, ip, store.ActionResetRequest, l.limits.ResetRequestIP)
}

// CheckRefreshIP counts one refresh against the client IP.
func (l *Limiter) CheckRefreshIP(ctx context.Context, ip string) error {
	return l.checkIP(ctx, ip, store.ActionRefresh, l.limits.RefreshIP)
}

// CheckRefreshSession counts one refresh against a session. The table's scope CHECK has no session scope, so
// the session id is kept under scope 'device' (a session id never collides with a device id: both are fresh
// UUIDv7s) rather than needing a migration.
func (l *Limiter) CheckRefreshSession(ctx context.Context, sessionID uuid.UUID) error {
	now := l.now()
	n, ws, err := l.count(ctx, store.ScopeDevice, sessionID.String(), store.ActionRefresh, l.limits.RefreshSession)
	if err != nil {
		return err
	}
	if n > l.limits.RefreshSession.Max {
		return retryAfter(now, ws, l.limits.RefreshSession.Window)
	}
	return nil
}
