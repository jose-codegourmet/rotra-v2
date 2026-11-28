package queuewrites_test

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/signin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/queuewrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

// buildSignOut is build with the Player's sign-out of the sign-in package behind the sign-out route, as main wires it.
func buildSignOut(pool *pgxpool.Pool, svc *session.Service, _ *store.Store, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	signOut, err := signin.SignOut(signin.Deps{Service: svc, Verifier: svc.Authenticator().Verifier(), Clock: now, Logger: log}, store.AudiencePlayer)
	if err != nil {
		panic(err)
	}
	routes, err := queuewrites.Routes(queuewrites.Deps{Pool: pool, Auth: svc.Authenticator(), Logger: log, Now: now, QueueOrigins: []string{"http://localhost:9000"}, PlayerOrigins: []string{"http://localhost:9001"}, PlayerSignOut: signOut})
	if err != nil {
		panic(err)
	}
	rt := signedin.NewRouter()
	routes(rt)
	return rt.Mount
}
