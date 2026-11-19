package signedin

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
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
	// Limiter is the per-IP public-read budget of the reads a visitor may make too (the leaderboards, the profile, the
	// RTR ID lookup, rank and games). Main passes the one the public reads share; nil gets a default.
	Limiter *httpapi.RateLimiter
	// ApprovedAlgorithms are the rank algorithm versions /rank may show (#247). Production passes none.
	ApprovedAlgorithms []string
	// QueueOrigins are the exact Queue origins that may call the credentialed stats read (the paired Queue pages).
	QueueOrigins []string
	// PasswordResets lists the Admin's password-reset requests (the recovery service). Nil leaves that route out.
	PasswordResets PasswordResetReader
}

type server struct {
	pool         *pgxpool.Pool
	auth         *session.Authenticator
	log          *slog.Logger
	now          func() time.Time
	queueOrigins []string
	approved     []string
	viewer       *publicreads.ViewerReads
	resets       PasswordResetReader
}

// Register builds the routes. They sit behind the proxy-secret guard like every route that is not in its open
// list, and each one checks the sign-in pass of the app that asked.
func Register(d Deps) (func(*http.ServeMux), error) {
	if d.Pool == nil || d.Auth == nil {
		return nil, errors.New("signedin: routes need a pool and an authenticator")
	}
	s := &server{pool: d.Pool, auth: d.Auth, log: d.Logger, now: d.Now, queueOrigins: d.QueueOrigins, approved: d.ApprovedAlgorithms, resets: d.PasswordResets}
	if s.log == nil {
		s.log = slog.New(slog.DiscardHandler)
	}
	if s.now == nil {
		s.now = time.Now
	}
	s.viewer = publicreads.NewViewerReads(publicreads.Deps{
		Pool: d.Pool, Limiter: d.Limiter, Logger: s.log, Now: s.now, ApprovedAlgorithms: d.ApprovedAlgorithms,
	})
	rt := NewRouter()
	s.registerPlayer(rt)
	s.registerAdmin(rt)
	s.registerQueue(rt)
	return rt.Mount, nil
}
