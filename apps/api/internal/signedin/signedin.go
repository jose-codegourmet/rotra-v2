package signedin

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
)

// Deps is what the signed-in reads are built from.
type Deps struct {
	Pool *pgxpool.Pool
	// Auth checks the access pass of each request; it comes from the sign-in session service.
	Auth *session.Authenticator
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
	// Now is the clock for what depends on today (notification windows, the Google deadline). Nil is time.Now.
	Now func() time.Time
}

type server struct {
	pool *pgxpool.Pool
	auth *session.Authenticator
	log  *slog.Logger
	now  func() time.Time
}

// Register builds the routes. They sit behind the proxy-secret guard like every route that is not in its open
// list, and each one checks the sign-in pass of the app that asked.
func Register(d Deps) (func(*http.ServeMux), error) {
	if d.Pool == nil || d.Auth == nil {
		return nil, errors.New("signedin: routes need a pool and an authenticator")
	}
	s := &server{pool: d.Pool, auth: d.Auth, log: d.Logger, now: d.Now}
	if s.log == nil {
		s.log = slog.New(slog.DiscardHandler)
	}
	if s.now == nil {
		s.now = time.Now
	}
	rt := NewRouter()
	s.registerPlayer(rt)
	return rt.Mount, nil
}
