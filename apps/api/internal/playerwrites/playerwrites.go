// Package playerwrites serves the Player app's own POST, PATCH and DELETE routes that moved from the Next.js Route Handlers
// (apps/player/src/app/api/me/**, account/contact-change and packages/db/src/player/*.ts). Each route keeps the contract of
// the handler it replaces: same path, JSON shape, status codes, error envelope and cache headers, and the same rows and
// revision checks in the database. None of these routes writes an audit event or a notification, as the TypeScript does not.
//
// Each group of routes is one file (profile.go for the profile, the banner and the stats switches). To add a group: write its
// cases and capture (see internal/writetest), add the file, and register its routes in registerRoutes. Every route runs behind
// the Player pass check in write mode and the Google deadline gate (player), and through writes.Handle.
package playerwrites

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/clubjoin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Deps is what the Player writes are built from.
type Deps struct {
	Pool *pgxpool.Pool
	// Auth checks the access pass of each request; it comes from the sign-in session service.
	Auth *session.Authenticator
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
	// Now is the clock the rows are stamped with (Prisma stamps updated times with the application clock) and the
	// notification window and the Google deadline are read against. Nil is time.Now.
	Now func() time.Time
}

type server struct {
	pool *pgxpool.Pool
	auth *session.Authenticator
	log  *slog.Logger
	now  func() time.Time
}

// Routes returns what registers the Player writes on the shared signedin router (signedin.Deps.Routes).
func Routes(d Deps) (func(*signedin.Router), error) {
	if d.Pool == nil || d.Auth == nil {
		return nil, errors.New("playerwrites: routes need a pool and an authenticator")
	}
	s := &server{pool: d.Pool, auth: d.Auth, log: d.Logger, now: d.Now}
	if s.log == nil {
		s.log = slog.New(slog.DiscardHandler)
	}
	if s.now == nil {
		s.now = time.Now
	}
	return s.registerRoutes, nil
}

// registerRoutes adds the Player app's writes. A path that another app answers too is routed per app by the router.
func (s *server) registerRoutes(rt *signedin.Router) {
	s.registerProfile(rt)
	s.registerPrivacy(rt)
	s.registerNotifications(rt)
	s.registerClubs(rt)
	s.registerContactChange(rt)
}

// stamp is the clock as Prisma writes it: milliseconds, like a JavaScript Date.
func (s *server) stamp() pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: s.at(), Valid: true}
}

// at is `new Date()`: the clock in milliseconds.
func (s *server) at() time.Time { return s.now().Truncate(time.Millisecond) }

// self is the signed-in player's ID.
func self(p session.Principal) pgtype.UUID { return pgtype.UUID{Bytes: p.AccountID, Valid: true} }

// player is handleAccountRequest('player', ...) for a write: the pass check in write mode, then the deadline gate (none of
// these routes passes allowWithoutGoogle), then the command. The gate runs before the body is read, as in the TypeScript.
func (s *server) player(cmd writes.Command) http.Handler {
	gated := func(r *http.Request, p session.Principal) (writes.Result, error) {
		required, err := signedin.GoogleRequired(r.Context(), s.pool, s.now, self(p))
		if err != nil {
			return writes.Result{}, err
		}
		if required {
			return writes.Result{}, writes.Fail(httpapi.ErrForbidden, map[string]string{"google": signedin.GoogleRequiredMessage})
		}
		return cmd(r, p)
	}
	return s.auth.Require(store.AudiencePlayer, session.ModeWrite)(writes.Handle(s.log, gated))
}

// parseUUID is the TypeScript's UUID test (see clubjoin.ParseUUID).
func parseUUID(s string) (pgtype.UUID, bool) { return clubjoin.ParseUUID(s) }

// account is the revision half of the answers that carry `revision`: readMyAccount after the commit, on its own read.
func (s *server) account(ctx context.Context, id pgtype.UUID) (signedin.MyAccount, error) {
	return signedin.ReadMyAccount(ctx, sqlcgen.New(s.pool), id)
}
