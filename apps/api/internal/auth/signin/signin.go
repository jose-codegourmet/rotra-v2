// Package signin is the HTTP face of the Go sign-in (go-sign-in tasks 3.1 to 3.3): the credential sign-in for
// the club (username), player (email) and Admin (email) apps, and the session, sign-out and refresh routes
// they share. It ports packages/db/src/auth/sign-in.ts and the apps' /api/auth route handlers.
//
// All three apps use the same paths. Each app's proxy.ts names itself in the X-Rotra-App header (club, player
// or admin); the proxy guard has already refused every request that lacks the proxy secret, so the header is
// only ever read from a trusted caller. The audience is never inferred from cookie names.
package signin

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// AppHeader names the app a request is for: "club", "player" or "admin".
const AppHeader = "X-Rotra-App"

// Deps is what the routes are built from.
type Deps struct {
	Service  *session.Service
	Store    *store.Store
	Verifier *pass.Verifier
	// Clock must be the Service's clock (cookie lifetimes are measured against it); nil is time.Now.
	Clock func() time.Time
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
}

type handlers struct {
	svc      *session.Service
	st       *store.Store
	verifier *pass.Verifier
	now      func() time.Time
	log      *slog.Logger
}

// Register builds the routes. They are not in the proxy guard's open list, so they answer 404 without the
// proxy secret (B-30).
func Register(d Deps) (func(*http.ServeMux), error) {
	if d.Service == nil || d.Store == nil || d.Verifier == nil {
		return nil, errors.New("signin: routes need a session service, a store and a verifier")
	}
	h := &handlers{svc: d.Service, st: d.Store, verifier: d.Verifier, now: d.Clock, log: d.Logger}
	if h.now == nil {
		h.now = time.Now
	}
	if h.log == nil {
		h.log = slog.New(slog.DiscardHandler)
	}
	return func(mux *http.ServeMux) {
		mux.Handle("POST /api/auth/sign-in", h.forApp(h.signIn))
		mux.Handle("GET /api/auth/session", h.forApp(h.readSession))
		mux.Handle("POST /api/auth/sign-out", h.forApp(h.signOut))
		mux.Handle("POST /api/auth/refresh", h.forApp(h.refresh))
	}, nil
}

// forApp resolves the audience from the app header. A missing or unknown value is the generic 404: no audience
// is guessed.
func (h *handlers) forApp(next func(http.ResponseWriter, *http.Request, store.Audience)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch aud := store.Audience(r.Header.Get(AppHeader)); aud {
		case store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin:
			next(w, r, aud)
		default:
			httpapi.WriteError(w, httpapi.ErrNotFound, nil)
		}
	})
}

// envelope is the error body the apps already parse: { error: { code, message } }. httpapi keeps its own
// copy private and writes the catalog's fixed messages; the credential routes need their own copy.
type envelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func fail(w http.ResponseWriter, status int, code, message string) {
	var b envelope
	b.Error.Code, b.Error.Message = code, message
	httpapi.WriteJSON(w, status, b, httpapi.Private)
}

// Copy of packages/db/src/auth/sign-in.ts. The credential messages are identical whatever was wrong, so a
// caller can never tell an unknown login from a wrong password.
const (
	msgUnavailable = "Signing in is not available right now. Try again." // sign-in.ts:91
	// msgRateLimited is the public reads' copy (internal/auth/pass): there is no sign-in throttle copy in the
	// screen docs yet, so it is reused as is. The Retry-After header carries the real wait.
	msgRateLimited = "Too many requests. Try again in a minute."
)

var msgInvalid = map[store.Audience]string{ // sign-in.ts:80-84
	store.AudienceClub:   "Enter your club username and password.",
	store.AudiencePlayer: "Enter your email and password.",
	store.AudienceAdmin:  "Enter your sign-in details.",
}

var msgBadCredentials = map[store.Audience]string{ // sign-in.ts:24-28
	store.AudienceAdmin:  "Email or password is incorrect.",
	store.AudienceClub:   "Username or password is incorrect.",
	store.AudiencePlayer: "That email and password don't match. Check them and try again.",
}

func unavailable(w http.ResponseWriter) {
	fail(w, http.StatusServiceUnavailable, "unavailable", msgUnavailable)
}

func badCredentials(w http.ResponseWriter, aud store.Audience) {
	fail(w, http.StatusUnauthorized, "unauthenticated", msgBadCredentials[aud])
}

func rateLimited(w http.ResponseWriter, err *session.RateLimitedError) {
	httpapi.WriteRateLimited(w, err.RetryAfterSeconds(), msgRateLimited)
}
