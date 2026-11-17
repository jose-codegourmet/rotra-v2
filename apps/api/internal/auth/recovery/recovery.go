// Package recovery is the Admin-reviewed password recovery for players (go-sign-in task 3.4). It ports
// packages/db/src/admin/password-resets.ts, resetPassword in packages/db/src/player/account-access.ts and the Player
// app's POST /api/auth/password-reset and POST /api/auth/reset-password.
//
// The flow, as decided (D-2026-11-07-01, D-2026-11-09-14): a player who forgot the password submits their email
// (Submit, always the same generic answer); an Admin reads the requests (ReadRequests), verifies who is asking
// out of band and issues a one-time link or declines (Review); the player opens the link and sets a new password
// (Reset). Nothing is emailed.
//
// Supabase generated the link, verified it and set the password. Go has no provider: the token is 32 random bytes
// made here, only its SHA-256 is stored (token_digest), and Reset sets the identity's password, ends every session
// and writes the events in one transaction.
//
// Submit, ReadRequests, Review and Reset are plain service functions. The two public routes (Routes) use Submit
// and Reset. The Admin list and review routes belong to go-writes-admin-player (track 8), which authenticates the
// Admin and calls ReadRequests and Review; they are not registered here.
package recovery

import (
	"errors"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// LinkLifetime is how long a reviewed link works, counted from the review (the owner's answer). The table has no
// expiry column, so the consume checks reviewed_at + LinkLifetime; issuing again starts a fresh 24 hours.
const LinkLifetime = 24 * time.Hour

// The copy of the TypeScript services (password-resets.ts, account-access.ts).
const (
	msgEmail            = "Enter an email address, like name@example.com."
	msgOwnership        = "Verify account ownership before generating a link."
	msgAccount          = "This account is unavailable or its email changed. Ask the player to submit a new request with their current email."
	msgNewPassword      = "Enter a new password."
	msgLinkUsed         = "This reset link has expired or was already used."
	msgResetUnavailable = "The reset could not be completed. Request another reset link."
)

// Error is a refusal in the Route Handlers' vocabulary: a ServiceError code and its field messages. Callers answer
// it with httpapi.WriteError(w, e.Code, e.Fields). Any other error a method returns is unexpected (a 500, logged).
type Error struct {
	Code   httpapi.ErrorCode
	Fields map[string]string
	// Err is the cause of an `unavailable`, for the log only.
	Err error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return "recovery: " + string(e.Code) + ": " + e.Err.Error()
	}
	return "recovery: " + string(e.Code)
}

// Unwrap exposes the cause.
func (e *Error) Unwrap() error { return e.Err }

func refuse(code httpapi.ErrorCode, field, message string) *Error {
	if field == "" {
		return &Error{Code: code}
	}
	return &Error{Code: code, Fields: map[string]string{field: message}}
}

// Deps is what a Recovery is built from.
type Deps struct {
	Pool *pgxpool.Pool
	// Service is the sign-in core: its hasher, reset limiter and session revocation.
	Service *session.Service
	Store   *store.Store
	// Clock must be the Service's clock; nil is time.Now.
	Clock func() time.Time
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
}

// Recovery is the recovery service. It is safe for concurrent use.
type Recovery struct {
	pool *pgxpool.Pool
	svc  *session.Service
	st   *store.Store
	now  func() time.Time
	log  *slog.Logger
}

// New builds a Recovery.
func New(d Deps) (*Recovery, error) {
	if d.Pool == nil || d.Service == nil || d.Store == nil {
		return nil, errors.New("recovery: needs a pool, a session service and a store")
	}
	r := &Recovery{pool: d.Pool, svc: d.Service, st: d.Store, now: d.Clock, log: d.Logger}
	if r.now == nil {
		r.now = time.Now
	}
	if r.log == nil {
		r.log = slog.New(slog.DiscardHandler)
	}
	return r, nil
}

// clock is the current time at whole-second precision, like the session service.
func (r *Recovery) clock() time.Time { return r.now().UTC().Truncate(time.Second) }
