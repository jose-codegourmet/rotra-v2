package session

import (
	"errors"
	"fmt"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// Refresh outcomes. The HTTP layer answers all of them as "not signed in" and clears the cookies; they differ
// so the log and the tests can tell them apart.
var (
	// ErrInvalidRefresh: the refresh pass matches no session (unknown, malformed, or older than the previous
	// one). Nothing is revoked: a stranger guessing passes must not be able to sign people out.
	ErrInvalidRefresh = errors.New("session: invalid refresh pass")
	// ErrRefreshRefused: the session is revoked or expired, or its identity or account may no longer sign in.
	ErrRefreshRefused = errors.New("session: refresh refused")
	// ErrRefreshReused: a retired refresh pass came back after the grace window (B-29). The session is revoked.
	ErrRefreshReused = errors.New("session: refresh pass reused")
)

// Per-request authentication outcomes.
var (
	// ErrExpired: the access pass is no longer valid but is the kind of pass Go issues (expired, or signed by a
	// key that was removed from the set). The client refreshes and retries; the API answers the "expired" 401.
	ErrExpired = errors.New("session: access pass expired")
	// ErrUnauthenticated: no pass, or one that does not verify, or its account can no longer sign in.
	ErrUnauthenticated = errors.New("session: not signed in")
	// ErrWrongAccount: a valid pass, but for another app (audience).
	ErrWrongAccount = errors.New("session: pass is for another app")
	// ErrSessionRevoked: the session behind a valid pass was revoked or has expired (checked on writes).
	ErrSessionRevoked = errors.New("session: session revoked")
)

// ErrRateLimited is matched with errors.Is; the concrete error is a *RateLimitedError.
var ErrRateLimited = errors.New("session: rate limited")

// ErrNotFound is store.ErrNotFound, re-exported: no such session, device or identity for the caller.
var ErrNotFound = store.ErrNotFound

// RateLimitedError says how long until the counter's window ends.
type RateLimitedError struct{ RetryAfter time.Duration }

func (e *RateLimitedError) Error() string {
	return fmt.Sprintf("session: rate limited, retry in %d s", e.RetryAfterSeconds())
}

// Is makes errors.Is(err, ErrRateLimited) true.
func (e *RateLimitedError) Is(target error) bool { return target == ErrRateLimited }

// RetryAfterSeconds is RetryAfter rounded up to whole seconds, never less than 1 (the Retry-After header).
func (e *RateLimitedError) RetryAfterSeconds() int {
	s := int((e.RetryAfter + time.Second - 1) / time.Second)
	return max(s, 1)
}
