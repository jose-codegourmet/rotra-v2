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
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// buildShared mounts the Queue writes on the router the signed-in reads use, as main does: net/http panics on two patterns neither of
// which is more specific, so a clash with a read (or another write) shows here.
func buildShared(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	routes, err := queuewrites.Routes(queuewrites.Deps{Pool: pool, Auth: auth, Logger: log, Now: now})
	if err != nil {
		panic(err)
	}
	register, err := signedin.Register(signedin.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, Routes: []func(*signedin.Router){routes}})
	if err != nil {
		panic(err)
	}
	return register
}

// The writes answer through the shared router, next to the reads of the same paths.
func TestWritesShareTheRouterWithTheReads(t *testing.T) {
	e := writetest.NewEnv(t, clock, buildShared)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	pass := e.ClubPass(t, smash)
	read := e.Do(writetest.Request{Method: "GET", Path: "/api/sessions/" + session1, App: "club", Bearer: pass})
	if read.Code != 200 {
		t.Fatalf("the read answered %d: %s", read.Code, read.Body)
	}
	write := e.Do(writetest.Request{Method: "PATCH", Path: "/api/sessions/" + session1, App: "club", Bearer: pass, Body: `{"acceptJoinRequests":false}`})
	if write.Code != 200 {
		t.Fatalf("the write answered %d: %s", write.Code, write.Body)
	}
}
