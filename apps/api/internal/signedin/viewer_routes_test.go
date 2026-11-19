package signedin_test

import (
	"strings"
	"testing"
	"time"
)

const (
	aliceSubject = "f3000000-0000-4000-8000-000000000001"
	bobSubject   = "f3000000-0000-4000-8000-000000000002"
	carlaID      = "d3000000-0000-4000-8000-000000000003"
)

func profileEnv(t *testing.T) *env {
	t.Helper()
	e := newEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC))
	e.loadSeed(t, "profile.seed.sql")
	e.relinkPlayers(t, nil)
	return e
}

// The paths a visitor may read are the Player app's here and the Admin app's elsewhere, so they are routed per app.
func TestViewerReadsAreServedToTheSignedInPlayerAndTheVisitorOfThePlayerAppOnly(t *testing.T) {
	e := profileEnv(t)
	paths := []string{"/api/leaderboard", "/api/leaderboard/search?q=ali", "/api/players/" + carlaID, "/api/players/" + carlaID + "/rank",
		"/api/players/" + carlaID + "/games", "/api/rtr-ids/RTR-PH-CEB-102926-0001"}
	for _, p := range paths {
		// The Admin app has its own read of a player and of a player's games: it asks for its pass (see admin_golden_test.go).
		adminCode := 404
		if p == "/api/players/"+carlaID || p == "/api/players/"+carlaID+"/games" {
			adminCode = 401
		}
		for _, c := range []struct {
			name string
			req  req
			code int
		}{
			{"visitor of the Player app", req{path: p, app: "player"}, 200},
			{"signed in", req{path: p, app: "player", bearer: e.accessPass(t, aliceSubject)}, 200},
			{"no app header", req{path: p}, 404},
			{"Admin app", req{path: p, app: "admin"}, adminCode},
			{"Queue app", req{path: p, app: "club"}, 404},
			{"no proxy secret", req{path: p, app: "player", noSecret: true}, 404},
		} {
			if w := e.do(c.req); w.Code != c.code {
				t.Errorf("%s: %s = %d, want %d (%s)", p, c.name, w.Code, c.code, w.Body.String())
			}
		}
	}
}

// A pass for another app, or one that no longer verifies, is a visitor on these reads; an expired one is told so.
func TestViewerReadsTreatAnUnusablePassAsAVisitorExceptWhenItExpired(t *testing.T) {
	e := profileEnv(t)
	path := "/api/players/d3000000-0000-4000-8000-000000000002" // Bob is private: a visitor gets 401
	if w := e.do(req{path: path, app: "player", bearer: "garbage"}); w.Code != 401 || errCode(t, w) != "unauthenticated" {
		t.Fatalf("garbage pass: %d %s", w.Code, w.Body.String())
	}
	if w := e.do(req{path: path, app: "player", bearer: e.accessPass(t, aliceSubject)}); w.Code != 200 {
		t.Fatalf("a signed-in player sees a private profile: %d %s", w.Code, w.Body.String())
	}
	pass := e.accessPass(t, aliceSubject)
	e.clk.Set(e.clk.Now().Add(16 * time.Minute))
	if w := e.do(req{path: path, app: "player", bearer: pass}); w.Code != 401 || errCode(t, w) != "expired" {
		t.Fatalf("expired pass: %d %s", w.Code, w.Body.String())
	}
}

func TestMyLeaderboardMyProfileAndStatsNeedAPlayerPass(t *testing.T) {
	e := profileEnv(t)
	for _, p := range []string{"/api/leaderboard/me", "/api/me/profile", "/api/rtr-ids/RTR-PH-CEB-102926-0002/stats"} {
		origin := ""
		if strings.HasSuffix(p, "/stats") {
			origin = queueOrigin
		}
		if w := e.do(req{path: p, app: "player", origin: origin}); w.Code != 401 || errCode(t, w) != "unauthenticated" {
			t.Errorf("%s with no pass: %d %s", p, w.Code, w.Body.String())
		}
		if w := e.do(req{path: p, app: "admin", origin: origin, bearer: e.accessPass(t, aliceSubject)}); w.Code != 404 {
			t.Errorf("%s for the Admin app: %d", p, w.Code)
		}
	}
}

// The stats read is a credentialed call from the paired Queue origin: every answer carries its CORS headers, and
// any other origin (or none) is refused before the pass is looked at.
func TestStatsReadAllowsOnlyTheQueueOrigin(t *testing.T) {
	e := profileEnv(t)
	const path = "/api/rtr-ids/RTR-PH-CEB-102926-0002/stats"
	bearer := e.accessPass(t, bobSubject)
	for _, origin := range []string{"", "https://evil.example", "http://localhost:9001", queueOrigin + "/"} {
		w := e.do(req{path: path, app: "player", bearer: bearer, origin: origin})
		if w.Code != 403 || w.Body.String() != `{"error":{"code":"forbidden"}}` {
			t.Errorf("origin %q: %d %s", origin, w.Code, w.Body.String())
		}
		if w.Header().Get("Access-Control-Allow-Origin") != "" || w.Header().Get("Vary") != "Origin, Cookie" {
			t.Errorf("origin %q: headers %v", origin, w.Header())
		}
	}
	w := e.do(req{path: path, app: "player", bearer: bearer, origin: queueOrigin})
	if w.Code != 200 || w.Header().Get("Access-Control-Allow-Origin") != queueOrigin ||
		w.Header().Get("Access-Control-Allow-Credentials") != "true" || w.Header().Get("Vary") != "Origin, Cookie" {
		t.Errorf("allowed origin: %d %v %s", w.Code, w.Header(), w.Body.String())
	}
}

// The Google gate that every signed-in Player read has (after the deadline) does not apply to the leaderboard place.
func TestMyLeaderboardStaysOpenAfterTheGoogleDeadlineButMyProfileDoesNot(t *testing.T) {
	e := profileEnv(t)
	e.exec(t, `UPDATE player_accounts SET google_email = NULL, google_linked_at = NULL`)
	e.exec(t, `INSERT INTO feature_flags (key, name, description, value, updated_at) VALUES ('player_google_sign_in', 'Google sign-in', 'Test', true, now()) ON CONFLICT (key) DO UPDATE SET value = true`)
	e.clk.Set(time.Date(2027, 1, 2, 0, 0, 0, 0, time.UTC))
	bearer := e.accessPass(t, aliceSubject)
	if w := e.do(req{path: "/api/leaderboard/me", app: "player", bearer: bearer}); w.Code != 200 {
		t.Errorf("leaderboard/me: %d %s", w.Code, w.Body.String())
	}
	if w := e.do(req{path: "/api/me/profile", app: "player", bearer: bearer}); w.Code != 403 || errCode(t, w) != "forbidden" {
		t.Errorf("me/profile: %d %s", w.Code, w.Body.String())
	}
}
