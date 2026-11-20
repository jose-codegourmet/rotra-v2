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
)

func TestMain(m *testing.M) { testpg.Main(m) }

// build registers the Queue writes behind the shared signedin router, as main does, with the clock of the case.
func build(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	routes, err := queuewrites.Routes(queuewrites.Deps{Pool: pool, Auth: auth, Logger: log, Now: now})
	if err != nil {
		panic(err)
	}
	rt := signedin.NewRouter()
	routes(rt)
	return rt.Mount
}
