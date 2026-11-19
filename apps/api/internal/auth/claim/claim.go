// Package claim is the Player app's registration link (go-sign-in task 3.2): GET /api/claim/{token} shows who the
// link is for, and POST /api/claim/{token} finishes registering. It ports packages/db/src/player/{claim,
// account-access}.ts and apps/player/src/app/api/claim/[token]/route.ts.
//
// Where the TypeScript staged a Supabase login before its database transaction, Go has no provider: one
// transaction creates the player (a club record's link) or claims the staged one (a player's link), the private
// contact, the RTR ID, the sign-in identity and account, links other clubs' records with the same phone, saves the
// profile details and consumes the link. Then it signs the player in like POST /api/auth/sign-in.
//
// The routes answer only the Player app (X-Rotra-App: player, set by its proxy.ts); another app or none is the
// catalog's 404. Errors use the Route Handler envelope { error: { code, message, fields? } }.
package claim

import (
	"context"
	"crypto/sha256"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// AppHeader names the app a request is for; the claim answers "player" only.
const AppHeader = "X-Rotra-App"

const (
	// readMessage is the human text of the 429 on the read (the public reads' text, B-43).
	readMessage = "Too many requests. Try again in a minute."
	// claimMessage is the human text of the 429 on a submit: no claim throttle copy exists in the screen docs, so
	// the same sentence is reused; Retry-After carries the real wait.
	claimMessage = readMessage
)

// Deps is what the routes are built from.
type Deps struct {
	Pool    *pgxpool.Pool
	Service *session.Service
	Store   *store.Store
	// ReadLimiter is the per-IP public-read budget; main passes the same instance the public reads use.
	ReadLimiter *httpapi.RateLimiter
	// Clock must be the Service's clock; nil is time.Now.
	Clock func() time.Time
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
}

type handlers struct {
	pool *pgxpool.Pool
	svc  *session.Service
	st   *store.Store
	read *httpapi.RateLimiter
	now  func() time.Time
	log  *slog.Logger
}

// Register builds the routes. They are not in the proxy guard's open list, so they answer 404 without the proxy
// secret (B-30).
func Register(d Deps) (func(*http.ServeMux), error) {
	if d.Pool == nil || d.Service == nil || d.Store == nil || d.ReadLimiter == nil {
		return nil, errors.New("claim: routes need a pool, a session service, a store and a read limiter")
	}
	h := (&handlers{pool: d.Pool, svc: d.Service, st: d.Store, read: d.ReadLimiter, now: d.Clock, log: d.Logger}).withDefaults()
	return func(mux *http.ServeMux) {
		mux.Handle("GET /api/claim/{token}", h.forPlayerApp(httpapi.RateLimit(h.read, readMessage, http.HandlerFunc(h.getLink))))
		mux.Handle("POST /api/claim/{token}", h.forPlayerApp(http.HandlerFunc(h.submit)))
	}, nil
}

// withDefaults fills the clock and the logger.
func (h *handlers) withDefaults() *handlers {
	if h.now == nil {
		h.now = time.Now
	}
	if h.log == nil {
		h.log = slog.New(slog.DiscardHandler)
	}
	return h
}

// forPlayerApp refuses every request that is not from the Player app, before anything is counted.
func (h *handlers) forPlayerApp(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if store.Audience(r.Header.Get(AppHeader)) != store.AudiencePlayer {
			httpapi.WriteError(w, httpapi.ErrNotFound, nil)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// digestOf is the stored form of a token: SHA-256 of its UTF-8 bytes (digest() in claim.ts).
func digestOf(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

// readTx runs fn on one repeatable-read, read-only snapshot, so the pieces of one answer agree.
func readTx(ctx context.Context, pool *pgxpool.Pool, fn func(*sqlcgen.Queries) error) (err error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return err
	}
	defer func() {
		if rbErr := tx.Rollback(context.WithoutCancel(ctx)); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) && err == nil {
			err = rbErr
		}
	}()
	return fn(sqlcgen.New(tx))
}
