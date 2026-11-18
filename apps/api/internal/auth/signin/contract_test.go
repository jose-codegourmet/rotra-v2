package signin_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Characterization of packages/db/src/auth/sign-in.ts (sign-in.ts:N) and the apps' route handlers
// (apps/{queue,player,admin}/src/app/api/auth/*/route.ts), ported to the Go routes. Behaviour that is new in Go
// (rate limits, the audience header) is marked NEW.

const (
	invalidClub   = "Enter your club username and password."                         // sign-in.ts:80
	invalidPlayer = "Enter your email and password."                                 // sign-in.ts:82
	invalidAdmin  = "Enter your sign-in details."                                    // sign-in.ts:84
	badClub       = "Username or password is incorrect."                             // sign-in.ts:26
	badPlayer     = "That email and password don't match. Check them and try again." // sign-in.ts:27
	badAdmin      = "Email or password is incorrect."                                // sign-in.ts:25
	unavailable   = "Signing in is not available right now. Try again."              // sign-in.ts:91
)

var apps = []string{"club", "player", "admin"}

func wantHeaders(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	h := w.Header()
	for k, v := range map[string]string{ // sign-in.ts:11-15
		"Cache-Control": "private, no-store", "Vary": "Cookie", "Content-Type": "application/json",
	} {
		if got := h.Get(k); got != v {
			t.Errorf("%s: got %q, want %q (status %d)", k, got, v, w.Code)
		}
	}
}

// NEW: the app is named by X-Rotra-App (set by each app's proxy.ts); a missing or unknown value is a 404.
func TestAudienceHeader(t *testing.T) {
	e := newEnv(t)
	routes := []req{
		{method: "POST", path: "/api/auth/sign-in", body: cred("a", "b")},
		{method: "GET", path: "/api/auth/session"},
		{method: "POST", path: "/api/auth/sign-out"},
		{method: "POST", path: "/api/auth/refresh"},
	}
	for _, r := range routes {
		for _, app := range []string{"", "Club", "owner", "club,admin", " club"} {
			r.app = app
			w := e.do(r)
			code, _ := errBody(t, w)
			if w.Code != http.StatusNotFound || code != "not_found" {
				t.Errorf("%s %s app=%q: %d %s", r.method, r.path, app, w.Code, w.Body.String())
			}
			wantHeaders(t, w)
		}
	}
	if n := e.sessions(t) + e.count(t, `SELECT count(*) FROM auth_rate_limits`); n != 0 {
		t.Fatalf("a refused audience must touch nothing, found %d rows", n)
	}
}

// The proxy guard answers 404 without the secret, before any handler (B-30).
func TestNeedsProxySecret(t *testing.T) {
	e := newEnv(t)
	acct := e.newPlayer(t, "ana@example.com", "Ana Reyes")
	_ = acct
	w := e.do(req{method: "POST", path: "/api/auth/sign-in", app: "player", body: cred("ana@example.com", goodPass), noSecret: true})
	if w.Code != http.StatusNotFound || cookie(w, "rotra-player-access") != nil {
		t.Fatalf("no secret: %d %s", w.Code, w.Body.String())
	}
}

// Bad or unparseable JSON is treated as {} (route.ts:5), and a missing or non-string identifier or password is
// a 422 with the audience's copy (sign-in.ts:74-85), before the limiter or the database is touched.
func TestSignInValidation(t *testing.T) {
	want := map[string]string{"club": invalidClub, "player": invalidPlayer, "admin": invalidAdmin}
	bodies := map[string]string{
		"empty body":          "",
		"not json":            "{nope",
		"json null":           "null",
		"json array":          "[]",
		"json string":         `"x"`,
		"trailing garbage":    `{"identifier":"a","password":"b"} x`,
		"no fields":           "{}",
		"identifier number":   `{"identifier":1,"password":"x"}`,
		"password number":     `{"identifier":"a","password":2}`,
		"identifier only":     `{"identifier":"a"}`,
		"password only":       `{"password":"x"}`,
		"whitespace identity": `{"identifier":"   ","password":"x"}`,
		"empty password":      `{"identifier":"a","password":""}`,
		"null identifier":     `{"identifier":null,"password":"x"}`,
	}
	e := newEnv(t)
	for _, app := range apps {
		for name, body := range bodies {
			w := e.signIn(app, body)
			code, msg := errBody(t, w)
			if w.Code != http.StatusUnprocessableEntity || code != "invalid" || msg != want[app] {
				t.Errorf("%s/%s: %d %s", app, name, w.Code, w.Body.String())
			}
			wantHeaders(t, w)
		}
	}
	if n := e.count(t, `SELECT count(*) FROM auth_rate_limits`) + e.count(t, `SELECT count(*) FROM auth_events`); n != 0 {
		t.Fatalf("validation must run before the limiter: %d rows", n)
	}
}

// A whitespace-only password is not trimmed away (sign-in.ts:75): it passes validation and fails as a wrong
// password.
func TestWhitespacePasswordIsNotEmpty(t *testing.T) {
	e := newEnv(t)
	w := e.signIn("player", cred("ana@example.com", "   "))
	if code, msg := errBody(t, w); w.Code != http.StatusUnauthorized || code != "unauthenticated" || msg != badPlayer {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}
