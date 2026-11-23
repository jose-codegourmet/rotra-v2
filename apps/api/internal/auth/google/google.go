package google

import (
	"context"
	"crypto/subtle"
	"errors"
	"log/slog"
	"net/http"
	"net/netip"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// FlagKey is the platform feature flag that gates all of it (D-2026-11-18-01). It starts off.
const FlagKey = "player_google_sign_in"

// Message is FAILED in google-sign-in.ts: the one sentence for every way the trip to Google does not finish.
const Message = "Couldn't finish with Google. Try again."

const (
	connectForbidden = "This Google account can't be connected here."
	callbackPath     = "/api/auth/google/callback"
)

var flowKey = regexp.MustCompile(`^[a-z][a-z-]{0,23}$`)

// Deps is what the routes are built from.
type Deps struct {
	Pool    *pgxpool.Pool
	Service *session.Service
	Store   *store.Store
	// Client talks to Google. Nil means Google sign-in is not configured: Continue with Google answers "unavailable".
	Client *Client
	Sealer *Sealer
	// RedirectBase is the Player app's origin; Google returns the browser to RedirectBase + /api/auth/google/callback.
	RedirectBase string
	// Clock must be the Service's clock; nil is time.Now.
	Clock func() time.Time
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
}

// Handlers are the Google sign-in routes of the Player app, and what the registration shares with them.
type Handlers struct {
	pool   *pgxpool.Pool
	svc    *session.Service
	st     *store.Store
	fin    *claim.Finisher
	client *Client
	sealer *Sealer
	base   string
	now    func() time.Time
	log    *slog.Logger
}

// New builds the handlers. It needs everything except the client, which may be nil.
func New(d Deps) (*Handlers, error) {
	if d.Pool == nil || d.Service == nil || d.Store == nil || d.Sealer == nil {
		return nil, errors.New("google: the routes need a pool, a session service, a store and a sealer")
	}
	fin, err := claim.NewFinisher(claim.Deps{Pool: d.Pool, Service: d.Service, Store: d.Store, Clock: d.Clock, Logger: d.Logger})
	if err != nil {
		return nil, err
	}
	h := &Handlers{pool: d.Pool, svc: d.Service, st: d.Store, fin: fin, client: d.Client, sealer: d.Sealer, base: strings.TrimRight(d.RedirectBase, "/"), now: d.Clock, log: d.Logger}
	if h.now == nil {
		h.now = time.Now
	}
	if h.log == nil {
		h.log = slog.New(slog.DiscardHandler)
	}
	return h, nil
}

// Routes registers /api/auth/google/* and /api/claim/{token}/google. They answer only the Player app (X-Rotra-App: player, set
// by its proxy.ts) and are not in the proxy guard's open list, so they answer 404 without the proxy secret.
func (h *Handlers) Routes() func(*http.ServeMux) {
	return func(mux *http.ServeMux) {
		mux.Handle("POST /api/auth/google/start", h.gate(h.start))
		mux.Handle("GET /api/auth/google/callback", h.callbackGate(h.callback))
		mux.Handle("GET /api/auth/google/outcome", h.gate(h.peek))
		mux.Handle("POST /api/auth/google/outcome", h.gate(h.outcome))
		mux.Handle("POST /api/auth/google/link", h.gate(h.link))
		mux.Handle("GET /api/auth/google/unclaimed", h.gate(h.unclaimed))
		mux.Handle("POST /api/claim/{token}/google", h.gate(h.claimWithGoogle))
	}
}

// Enabled is googleSignInEnabled: the flag is a fresh read; a missing flag or a failed read is off.
func (h *Handlers) Enabled(ctx context.Context) bool {
	on, err := sqlcgen.New(h.pool).GetFeatureFlagValue(ctx, FlagKey)
	return err == nil && on
}

// Gate wraps a Google route of another package (the registration's): the Player app only, and Not found while the flag is off.
func (h *Handlers) Gate(next http.HandlerFunc) http.Handler { return h.gate(next) }

func (h *Handlers) gate(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if store.Audience(r.Header.Get(claim.AppHeader)) != store.AudiencePlayer || !h.Enabled(r.Context()) {
			httpapi.WriteError(w, httpapi.ErrNotFound, nil)
			return
		}
		next(w, r)
	})
}

// callbackGate is the same for the browser's own GET: Not found is an empty 404 that is never cached.
func (h *Handlers) callbackGate(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if store.Audience(r.Header.Get(claim.AppHeader)) != store.AudiencePlayer || !h.Enabled(r.Context()) {
			w.Header().Set("Cache-Control", "private, no-store")
			w.WriteHeader(http.StatusNotFound)
			return
		}
		next(w, r)
	})
}

func (h *Handlers) jar(w http.ResponseWriter, r *http.Request) jar {
	return jar{w: w, r: r, sealer: h.sealer, now: h.now, secure: strings.HasPrefix(h.base, "https://")}
}

// Held reads the Google account the callback verified and holds for this browser.
func (h *Handlers) Held(r *http.Request) (Held, bool) {
	var held Held
	ok := jar{r: r, sealer: h.sealer, now: h.now}.read(HeldCookie, "held", &held) && held.Email != ""
	return held, ok
}

// ReadResult reads what the callback decided for this browser.
func (h *Handlers) ReadResult(r *http.Request) (Result, bool) {
	var res Result
	ok := jar{r: r, sealer: h.sealer, now: h.now}.read(ResultCookie, "result", &res) && flowKey.MatchString(res.Key) && res.Intent.valid() && res.Outcome.known()
	if ok {
		res.Email, res.Name = truncate(res.Email, 320), truncate(res.Name, 200)
	}
	return res, ok
}

// IsNew is isNewGoogle: no ROTRA account has this Google email, as its connected Google or as its ROTRA email. A profile with no
// account that holds the email as a contact is not an account (it can be this very registration's staging, which a retry
// resumes); the claim's and the staging's own checks refuse an email another profile holds.
func (h *Handlers) IsNew(ctx context.Context, email string) (bool, error) {
	connected, err := h.accountByGoogleEmail(ctx, email)
	if err != nil || connected != nil {
		return false, err
	}
	c, err := h.contactByEmail(ctx, email)
	return c == nil || c.account == nil, err
}

// Drop forgets the held Google account and the result, as a taken answer does.
func (h *Handlers) Drop(w http.ResponseWriter, r *http.Request) {
	h.jar(w, r).clear(HeldCookie, ResultCookie, ReturnCookie)
}

func (o Outcome) known() bool {
	switch o {
	case OutcomeSignedIn, OutcomeHeld, OutcomeNotConnected, OutcomeTaken, OutcomeConnected, OutcomeFailed:
		return true
	}
	return false
}

func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// safeReturnPath is the rule of the TypeScript's `safeReturnPath`: only same-app absolute paths; never an external redirect,
// and never back into the API.
func safeReturnPath(returnTo string) string {
	const fallback = "/login"
	if returnTo == "" || len(returnTo) > 2000 || !strings.HasPrefix(returnTo, "/") || strings.HasPrefix(returnTo, "//") || strings.Contains(returnTo, `\`) {
		return fallback
	}
	u, err := url.Parse("https://rotra.local" + returnTo)
	if err != nil || u.Host != "rotra.local" || strings.HasPrefix(u.Path, "/api/") {
		return fallback
	}
	if u.RawQuery != "" {
		return u.EscapedPath() + "?" + u.RawQuery
	}
	return u.EscapedPath()
}

// currentPlayer is the signed-in player of the request, with the Go pass check: the player's id, or false for a visitor.
// A pass that expired answers 401 `expired` itself (the client refreshes and retries), and replied is true.
func (h *Handlers) currentPlayer(w http.ResponseWriter, r *http.Request) (id uuid.UUID, ok, replied bool) {
	p, err := h.svc.Authenticator().Authenticate(r.Context(), session.TokenFromRequest(r, store.AudiencePlayer), store.AudiencePlayer, session.ModeWrite)
	switch {
	case err == nil:
		return p.AccountID, true, false
	case errors.Is(err, session.ErrExpired):
		if w != nil {
			session.WriteExpired(w)
		}
		return uuid.Nil, false, w != nil
	case errors.Is(err, session.ErrUnauthenticated), errors.Is(err, session.ErrWrongAccount), errors.Is(err, session.ErrSessionRevoked):
		return uuid.Nil, false, false
	}
	h.log.ErrorContext(r.Context(), "checking the player's pass for Google sign-in failed", "error", err.Error())
	if w != nil {
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
	}
	return uuid.Nil, false, w != nil
}

// start is POST /api/auth/google/start: where the browser should go for Google. connect needs a signed-in player; the other
// intents are for visitors. Nothing is decided here.
func (h *Handlers) start(w http.ResponseWriter, r *http.Request) {
	body, err := writes.ReadBody(r)
	if err != nil {
		writes.Write(w, r, h.log, err)
		return
	}
	intent, key := Intent(body.Text("intent")), body.Text("key")
	if !intent.valid() || !flowKey.MatchString(key) {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	if intent == IntentConnect {
		if _, ok, replied := h.currentPlayer(w, r); replied {
			return
		} else if !ok {
			httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
			return
		}
	}
	if h.client == nil || h.base == "" {
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
		return
	}
	state, err1 := randomToken(24)
	nonce, err2 := randomToken(24)
	verifier, challenge, err3 := PKCE()
	if err := errors.Join(err1, err2, err3); err != nil {
		h.log.ErrorContext(r.Context(), "making a Google flow failed", "error", err.Error())
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
		return
	}
	h.jar(w, r).put(FlowCookie, "flow", flow{Intent: intent, Key: key, ReturnTo: safeReturnPath(body.Text("returnTo")), State: state, Verifier: verifier, Nonce: nonce})
	httpapi.WriteJSON(w, http.StatusOK, map[string]string{"url": h.client.AuthURL(h.base+callbackPath, state, challenge, nonce)}, httpapi.Private)
}

// callback is GET /api/auth/google/callback: Google sends the browser back here. It decides the outcome on the server, keeps
// it in short-lived cookies and redirects to the screen that started the trip; no email, code or token is ever put in the
// redirect. A callback this browser did not start (no flow cookie, or another state) decides nothing.
func (h *Handlers) callback(w http.ResponseWriter, r *http.Request) {
	j := h.jar(w, r)
	var f flow
	started := j.read(FlowCookie, "flow", &f) && f.Intent.valid() && flowKey.MatchString(f.Key)
	j.clear(FlowCookie)
	w.Header().Set("Cache-Control", "private, no-store")
	if !started {
		h.redirect(w, "/login")
		return
	}
	q := r.URL.Query()
	d := decision{outcome: OutcomeFailed}
	if sameState(q.Get("state"), f.State) && q.Get("error") == "" && q.Get("code") != "" && h.client != nil && h.tripAllowed(r) {
		v, err := h.client.Exchange(r.Context(), q.Get("code"), f.Verifier, h.base+callbackPath, f.Nonce)
		if err == nil {
			d = h.decide(w, r, f.Intent, v)
		} else if !errors.Is(err, ErrExchange) {
			h.log.ErrorContext(r.Context(), "finishing with Google failed", "error", err.Error())
		}
	}
	if d.held {
		j.put(HeldCookie, "held", Held{Email: d.google.Email, Name: d.google.Name})
	} else {
		j.clear(HeldCookie) // an earlier trip's held account must never outlive a later trip that decided something else
	}
	if d.outcome == OutcomeSignedIn || d.outcome == OutcomeConnected {
		h.clearGate(w, r) // the player has Google now
	}
	j.put(ResultCookie, "result", Result{Key: f.Key, Intent: f.Intent, Outcome: d.outcome, Email: d.google.Email, Name: d.google.Name})
	j.set(ReturnCookie, f.Key, true)
	h.redirect(w, safeReturnPath(f.ReturnTo))
}

// tripAllowed counts the callback against the per-IP limit before it asks Google anything. Over the limit, or when the limiter
// itself fails, the trip decides nothing (it is told it failed), and Google is not called.
func (h *Handlers) tripAllowed(r *http.Request) bool {
	err := h.svc.Limiter().CheckGoogleTrip(r.Context(), httpapi.ClientIPFrom(r.Context()))
	var limited *session.RateLimitedError
	if err != nil && !errors.As(err, &limited) {
		h.log.ErrorContext(r.Context(), "the Google trip limiter failed", "error", err.Error())
	}
	return err == nil
}

func (h *Handlers) redirect(w http.ResponseWriter, path string) {
	loc := path
	if h.base != "" {
		loc = h.base + path
	}
	w.Header().Set("Location", loc)
	w.WriteHeader(http.StatusSeeOther)
}

// sameState compares the state Google returned with the one this browser started with, in constant time.
func sameState(got, want string) bool {
	return want != "" && subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}

// issue makes the Player session of an account that Google just proved, and sets its cookies. The account's own sign-in
// identity is the one the session belongs to, as after a password sign-in.
func (h *Handlers) issue(w http.ResponseWriter, r *http.Request, subject, playerID uuid.UUID) error {
	ctx := r.Context()
	ident, err := h.st.GetIdentityByID(ctx, subject)
	if err != nil {
		return err
	}
	if ident.Audience != store.AudiencePlayer || ident.DisabledAt != nil {
		return errors.New("google: the account's identity may not sign in")
	}
	var ip *netip.Addr
	if a, err := netip.ParseAddr(httpapi.ClientIPFrom(ctx)); err == nil {
		ip = &a
	}
	issued, err := h.svc.Issue(ctx, session.IssueInput{Identity: ident, AccountID: playerID, IP: ip})
	if err != nil {
		return err
	}
	maxAge := issued.RefreshExpiresAt.Sub(h.now()) // as long as the session (B-62 amendment)
	session.SetCookies(w, r, store.AudiencePlayer, session.Cookies{Access: issued.AccessPass, AccessMaxAge: maxAge, Refresh: issued.RefreshPass, RefreshMaxAge: maxAge})
	return nil
}

func pgUUID(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }

func uuidOf(p pgtype.UUID) uuid.UUID { return uuid.UUID(p.Bytes) }

func pgText(s string) pgtype.Text { return pgtype.Text{String: s, Valid: true} }

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func ptr[T any](v T) *T { return &v }

func errNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }
