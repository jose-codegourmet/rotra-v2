package queuewrites_test

import (
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/queuewrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// build registers the Queue writes behind the shared signedin router, as main does, with the clock of the case.
func build(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	routes, err := queuewrites.Routes(queuewrites.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, QueueOrigins: []string{"http://localhost:9000"}, PlayerOrigins: []string{"http://localhost:9001"}})
	if err != nil {
		panic(err)
	}
	rt := signedin.NewRouter()
	routes(rt)
	return rt.Mount
}

// buildWithReads is build with the signed-in reads mounted too: GET finalization is the signedin package's route, which runs the projection jobs
// through the queuewrites drive before it reads.
func buildWithReads(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	deps := queuewrites.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, QueueOrigins: []string{"http://localhost:9000"}, PlayerOrigins: []string{"http://localhost:9001"}}
	routes, err := queuewrites.Routes(deps)
	if err != nil {
		panic(err)
	}
	drive, err := queuewrites.DriveFinalization(deps)
	if err != nil {
		panic(err)
	}
	mount, err := signedin.Register(signedin.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, QueueOrigins: deps.QueueOrigins, PlayerOrigins: deps.PlayerOrigins, Routes: []func(*signedin.Router){routes}, DriveFinalization: drive})
	if err != nil {
		panic(err)
	}
	return mount
}

// buildVisitor is build with the visitor receipt secret of the capture (empty: no secret set).
func buildVisitor(secret string) writetest.Build {
	return func(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
		routes, err := queuewrites.Routes(queuewrites.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, VisitorReceiptSecret: secret})
		if err != nil {
			panic(err)
		}
		rt := signedin.NewRouter()
		routes(rt)
		return rt.Mount
	}
}
