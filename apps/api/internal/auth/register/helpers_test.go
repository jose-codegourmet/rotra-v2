package register_test

import (
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/register"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// build registers the route the way main does.
func build(pool *pgxpool.Pool, svc *session.Service, st *store.Store, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	routes, err := register.Register(register.Deps{Pool: pool, Service: svc, Store: st, Logger: log, Clock: now})
	if err != nil {
		panic(err)
	}
	return routes
}

var _ writetest.BuildFull = build
