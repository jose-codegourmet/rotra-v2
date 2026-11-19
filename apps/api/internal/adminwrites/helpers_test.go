package adminwrites_test

import (
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/adminwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// build registers the Admin writes the way main does: on the router signedin.Register builds, next to the reads
// (the same path has a GET there and a POST here).
func build(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	routes, err := adminwrites.Routes(adminwrites.Deps{Pool: pool, Auth: auth, Logger: log, Now: now})
	if err != nil {
		panic(err)
	}
	register, err := signedin.Register(signedin.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, Routes: []func(*signedin.Router){routes}})
	if err != nil {
		panic(err)
	}
	return register
}

var _ writetest.Build = build
