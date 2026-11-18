// Package session is the core of the Go sign-in (go-sign-in R2 to R4): it issues sessions and their two passes,
// rotates refresh passes with reuse detection and the B-29 grace window, revokes sessions, authenticates
// requests, and rate-limits attempts. It composes the query layer (internal/auth/store), the pass signer
// and verifier (internal/auth/pass) and the password hasher (internal/auth/password).
//
// It has no credential sign-in route yet: the handlers of phase 3 verify a password (Service.Hasher), count
// attempts (Service.Limiter) and call Issue. Everything here takes already-trusted input and is HTTP free
// except the cookie helpers and the Authenticator's middleware.
package session

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

// Deps is what a Service is built from.
type Deps struct {
	Store    *store.Store
	Signer   *pass.Signer
	Verifier *pass.Verifier
	Hasher   *password.Hasher
	// Tuning holds the grace window, the revocation cache TTL and the rate limits (config.DefaultAuthTuning).
	Tuning config.AuthTuning
	// SigningKey is the key the Signer was built from. It only seeds the rate-limit subject key (HKDF); nil
	// uses a random per-process key. When set it must be the Signer's key.
	SigningKey ed25519.PrivateKey
	// Clock is the time source; nil is time.Now. Times are used at whole-second precision.
	Clock func() time.Time
	// Logger may be nil.
	Logger *slog.Logger
}

// Service is the sign-in core. It is safe for concurrent use.
type Service struct {
	st      *store.Store
	signer  *pass.Signer
	hasher  *password.Hasher
	tuning  config.AuthTuning
	now     func() time.Time
	log     *slog.Logger
	limiter *Limiter
	authn   *Authenticator
}

// New builds a Service and checks its configuration.
func New(d Deps) (*Service, error) {
	switch {
	case d.Store == nil:
		return nil, errors.New("session: a service needs a store")
	case d.Signer == nil:
		return nil, errors.New("session: a service needs a pass signer")
	case d.Verifier == nil:
		return nil, errors.New("session: a service needs a pass verifier")
	case d.Hasher == nil:
		return nil, errors.New("session: a service needs a password hasher")
	case d.Tuning.RefreshGrace < 0 || d.Tuning.RevocationCacheTTL < 0:
		return nil, errors.New("session: the grace window and the cache TTL must not be negative")
	}
	if d.SigningKey != nil {
		if len(d.SigningKey) != ed25519.PrivateKeySize || pass.KeyID(d.SigningKey.Public().(ed25519.PublicKey)) != d.Signer.KeyID() {
			return nil, errors.New("session: the signing key is not the signer's key")
		}
	}
	log := d.Logger
	if log == nil {
		log = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
	clock := d.Clock
	if clock == nil {
		clock = time.Now
	}
	limiter, err := NewLimiter(d.Store, d.Tuning.Limits, d.SigningKey, clock, log)
	if err != nil {
		return nil, err
	}
	s := &Service{st: d.Store, signer: d.Signer, hasher: d.Hasher, tuning: d.Tuning, now: clock, log: log, limiter: limiter}
	s.authn = newAuthenticator(d.Store, d.Verifier, d.Tuning.RevocationCacheTTL, clock, log)
	return s, nil
}

// Hasher is the password hasher phase 3's credential sign-in verifies with.
func (s *Service) Hasher() *password.Hasher { return s.hasher }

// Limiter is the rate limiter the credential, claim, reset and refresh routes count with.
func (s *Service) Limiter() *Limiter { return s.limiter }

// Authenticator is the per-request authenticator. Revocations done through this Service invalidate its cache.
func (s *Service) Authenticator() *Authenticator { return s.authn }

// clock returns the current time at whole-second precision, matching the passes.
func (s *Service) clock() time.Time { return s.now().UTC().Truncate(time.Second) }

const refreshPassBytes = 32

// newRefreshPass makes a random refresh pass (32 bytes, unpadded base64url) and its stored digest.
func newRefreshPass() (token string, digest []byte, err error) {
	var b [refreshPassBytes]byte
	if _, err := io.ReadFull(rand.Reader, b[:]); err != nil {
		return "", nil, fmt.Errorf("session: reading random bytes: %w", err)
	}
	token = base64.RawURLEncoding.EncodeToString(b[:])
	return token, sha256Of(token), nil
}

func sha256Of(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

// refreshDigest returns the digest of a refresh pass, or false when the text cannot be one (wrong length or
// characters, padding): such a pass is refused without touching the database.
func refreshDigest(token string) ([]byte, bool) {
	if len(token) != base64.RawURLEncoding.EncodedLen(refreshPassBytes) {
		return nil, false
	}
	if _, err := base64.RawURLEncoding.Strict().DecodeString(token); err != nil {
		return nil, false
	}
	return sha256Of(token), true
}

// accessFor signs the access pass of a session. accountID is the club, player or Admin id.
func (s *Service) accessFor(sess store.Session, accountID uuid.UUID, now time.Time) (string, time.Time, error) {
	c := pass.Claims{
		Subject: sess.IdentityID.String(), SessionID: sess.ID.String(), Audience: pass.Audience(sess.Audience),
		AccountID: accountID.String(),
	}
	if sess.Audience == store.AudienceClub && sess.ClubID != nil {
		c.ClubID = sess.ClubID.String()
	}
	token, err := s.signer.Sign(c, now)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("session: signing the access pass: %w", err)
	}
	return token, time.Unix(now.Unix(), 0).UTC().Add(s.signer.Lifetime()), nil
}
