// Package adminwrites serves the Admin app's POST, PATCH and DELETE routes that moved from the Next.js Route
// Handlers (apps/admin/src/app/api/**/route.ts and packages/db/src/admin/*.ts). Each route keeps the contract of
// the handler it replaces: same path, JSON shape, status codes, error envelope and cache headers, and the same rows,
// audit events and revision checks in the database.
//
// Each group of routes is one file (flags.go for the feature flags). To add a group: write its cases and capture
// (see internal/writetest), add the file, and register its routes in registerRoutes. Every write runs through
// writes.Handle behind the Admin pass check in write mode, in one transaction (writes.InTx), and appends its audit
// event with recordAudit in that same transaction.
package adminwrites

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Deps is what the Admin writes are built from.
type Deps struct {
	Pool *pgxpool.Pool
	// Auth checks the access pass of each request; it comes from the sign-in session service.
	Auth *session.Authenticator
	// Hasher hashes the password of the club login Add club creates (the shared argon2id hasher of sign-in).
	Hasher *password.Hasher
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
	// Now is the clock the rows are stamped with (Prisma stamps created, updated and occurred times with the
	// application clock). Nil is time.Now.
	Now func() time.Time
}

type server struct {
	pool   *pgxpool.Pool
	auth   *session.Authenticator
	hasher *password.Hasher
	log    *slog.Logger
	now    func() time.Time
}

// Routes returns what registers the Admin writes on the shared signedin router (signedin.Deps.Routes).
func Routes(d Deps) (func(*signedin.Router), error) {
	if d.Pool == nil || d.Auth == nil || d.Hasher == nil {
		return nil, errors.New("adminwrites: routes need a pool, an authenticator and a password hasher")
	}
	s := &server{pool: d.Pool, auth: d.Auth, hasher: d.Hasher, log: d.Logger, now: d.Now}
	if s.log == nil {
		s.log = slog.New(slog.DiscardHandler)
	}
	if s.now == nil {
		s.now = time.Now
	}
	return s.registerRoutes, nil
}

// registerRoutes adds the Admin app's writes. A path that another app answers too is routed per app by the router.
func (s *server) registerRoutes(rt *signedin.Router) {
	s.registerFlags(rt)
	s.registerRanking(rt)
	s.registerLicenses(rt)
	s.registerClubNames(rt)
	s.registerClubs(rt)
	s.registerProfiles(rt)
}

// stamp is the clock as Prisma writes it: milliseconds, like a JavaScript Date.
func (s *server) stamp() pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: s.now().Truncate(time.Millisecond), Valid: true}
}

// admin is the pass check of the Admin app for a write (handleAccountRequest('admin', ...)): it lets only an active
// admin account through, and checks that the session was not revoked.
func (s *server) admin(cmd writes.Command) http.Handler {
	return s.auth.Require(store.AudienceAdmin, session.ModeWrite)(writes.Handle(s.log, cmd))
}
