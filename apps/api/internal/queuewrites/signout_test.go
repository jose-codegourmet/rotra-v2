package queuewrites_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// signOutRequest is the sign-out call of the Queue page: from the paired Queue origin, with a JSON body.
func signOutRequest(pass string) writetest.Request {
	return writetest.Request{
		Method: "POST", Path: "/api/public-sessions/live-now/sign-out", App: "player", Bearer: pass, Body: `{}`,
		Headers: map[string]string{"Origin": "http://localhost:9000"},
	}
}

// The route ends the Player's session (the provider's signOut with scope local in the TypeScript) and clears both Player cookies. The
// golden cannot pin this: the capture has no Supabase, so its sign-out is a stand-in.
func TestPlayerSignOutRevokesTheSession(t *testing.T) {
	e := writetest.NewEnvFull(t, clock, buildSignOut)
	e.Players = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	const ann = "f4000000-0000-4000-8000-000000000001"
	pass := e.PlayerPass(t, ann)
	w := e.Do(signOutRequest(pass))
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "null" {
		t.Fatalf("sign-out answered %d %q", w.Code, w.Body)
	}
	cleared := map[string]bool{}
	for _, c := range w.Result().Cookies() {
		if c.MaxAge < 0 && c.Value == "" {
			cleared[c.Name] = true
		}
	}
	if !cleared[session.AccessCookieName("player")] || !cleared[session.RefreshCookieName("player")] {
		t.Fatalf("the Player cookies were not cleared: %v", w.Result().Header["Set-Cookie"])
	}
	var revoked int
	if err := e.Pool.QueryRow(e.Ctx, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL`).Scan(&revoked); err != nil {
		t.Fatal(err)
	}
	if revoked != 1 {
		t.Fatalf("%d sessions revoked, want 1", revoked)
	}
	// Signing out again is still a 200.
	again := e.Do(signOutRequest(pass))
	if again.Code != http.StatusOK {
		t.Fatalf("a second sign-out answered %d, want 200", again.Code)
	}
}

// A refused call (another origin) reaches no sign-out: the session stays and no cookie is cleared.
func TestPlayerSignOutFromAnotherOriginRevokesNothing(t *testing.T) {
	e := writetest.NewEnvFull(t, clock, buildSignOut)
	e.Players = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	pass := e.PlayerPass(t, "f4000000-0000-4000-8000-000000000001")
	req := signOutRequest(pass)
	req.Headers = map[string]string{"Origin": "http://localhost:9999"}
	w := e.Do(req)
	if w.Code != http.StatusForbidden || len(w.Result().Cookies()) != 0 {
		t.Fatalf("answered %d with cookies %v", w.Code, w.Result().Cookies())
	}
	var revoked int
	if err := e.Pool.QueryRow(e.Ctx, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL`).Scan(&revoked); err != nil {
		t.Fatal(err)
	}
	if revoked != 0 {
		t.Fatalf("%d sessions revoked, want 0", revoked)
	}
}
