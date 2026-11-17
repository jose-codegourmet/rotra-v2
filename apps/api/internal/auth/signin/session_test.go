package signin_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// signedOut is the body of a signed-out session read (sign-in.ts:107): null, or Admin's signed-out object.
func signedOut(aud store.Audience) any {
	if aud == store.AudienceAdmin {
		return map[string]any{"kind": "signed-out", "sessionEnded": false}
	}
	return nil
}

func (e *env) getSession(aud store.Audience, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	return e.do(req{method: "GET", path: "/api/auth/session", app: string(aud), cookies: cookies})
}

// seed makes an account of the audience and signs it in; it returns the sign-in response.
func (e *env) seed(t *testing.T, aud store.Audience) (acct, *httptest.ResponseRecorder) {
	t.Helper()
	var a acct
	var login string
	switch aud {
	case store.AudienceClub:
		a, login = e.newClub(t, "smash", "Smash Club"), "smash"
	case store.AudiencePlayer:
		a, login = e.newPlayer(t, "ana@example.com", "Ana Reyes"), "ana@example.com"
	default:
		a, login = e.newAdmin(t, "owner@rotra.club"), "owner@rotra.club"
	}
	w := e.signIn(string(aud), cred(login, goodPass))
	if w.Code != http.StatusOK {
		t.Fatalf("sign in: %d %s", w.Code, w.Body.String())
	}
	return a, w
}

// GET session (sign-in.ts:103-115): signed out is a 200 with null (club, player) or { kind: 'signed-out',
// sessionEnded: false } (Admin); signed in is the same body the sign-in returned.
func TestSessionRead(t *testing.T) {
	for _, aud := range []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin} {
		t.Run(string(aud)+" signed out", func(t *testing.T) {
			e := newEnv(t)
			w := e.getSession(aud)
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			bodyEquals(t, w, signedOut(aud))
		})
		t.Run(string(aud)+" signed in", func(t *testing.T) {
			e := newEnv(t)
			_, in := e.seed(t, aud)
			w := e.getSession(aud, in.Result().Cookies()...)
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			if got, want := w.Body.String(), in.Body.String(); got != want {
				t.Fatalf("session body %s, sign-in body %s", got, want)
			}
		})
	}
}

func TestSessionReadSignedOutCases(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudiencePlayer)
	access := cookie(in, "rotra-player-access")
	cases := map[string]*httptest.ResponseRecorder{
		"garbage cookie": e.getSession(store.AudiencePlayer, &http.Cookie{Name: "rotra-player-access", Value: "not.a.pass"}),
		"a pass of another app": e.do(req{method: "GET", path: "/api/auth/session", app: "club",
			cookies: []*http.Cookie{{Name: "rotra-club-access", Value: access.Value}}}),
		"an expired pass without a refresh cookie": nil, // set below
	}
	e.clk.Advance(16 * time.Minute)
	cases["an expired pass without a refresh cookie"] = e.getSession(store.AudiencePlayer, access)
	for name, w := range cases {
		if w.Code != http.StatusOK {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
			continue
		}
		wantHeaders(t, w)
		if w.Body.String() != "null" {
			t.Errorf("%s: %s", name, w.Body.String())
		}
	}
}

// B-62 amendment: a read that has no usable access pass but does carry this app's refresh cookie (the browser
// sends it to /api/auth/*) answers the distinct 401 `expired`, the same envelope the Authenticator writes, so
// the client refreshes once. It never refreshes inline and never touches cookies.
func TestSessionReadWithRefreshCookieIsExpired(t *testing.T) {
	for _, aud := range []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin} {
		e := newEnv(t)
		_, in := e.seed(t, aud)
		access, refresh := cookie(in, session.AccessCookieName(aud)), cookie(in, session.RefreshCookieName(aud))
		other := store.AudienceClub
		if aud == store.AudienceClub {
			other = store.AudiencePlayer
		}
		_, otherIn := e.seed(t, other) // a pass minted for another app, put in this app's access cookie
		cases := map[string][]*http.Cookie{
			"the refresh cookie only":     {refresh},
			"a garbage pass":              {{Name: access.Name, Value: "not.a.pass"}, refresh},
			"a pass of another app":       {{Name: access.Name, Value: cookie(otherIn, session.AccessCookieName(other)).Value}, refresh},
			"an expired well-signed pass": {access, refresh},
		}
		e.clk.Advance(16 * time.Minute)
		for name, cookies := range cases {
			w := e.getSession(aud, cookies...)
			code, _ := errBody(t, w)
			if w.Code != http.StatusUnauthorized || code != "expired" {
				t.Errorf("%s %s: %d %s", aud, name, w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			if len(w.Result().Cookies()) != 0 {
				t.Errorf("%s %s: the session read must not touch cookies", aud, name)
			}
		}
	}
}

func TestSessionReadBearer(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	w := e.do(req{method: "GET", path: "/api/auth/session", app: "club", bearer: cookie(in, "rotra-club-access").Value})
	if w.Body.String() != in.Body.String() {
		t.Fatalf("%s", w.Body.String())
	}
}

// An account disabled after sign-in reads as signed out; so does an Admin who lost authority (the TypeScript
// answered `denied` there, sign-in.ts:40-42; Go's per-request check refuses the pass instead).
func TestSessionReadAfterAccountDisabled(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceAdmin)
	e.exec(t, `UPDATE admin_accounts SET active = false`)
	e.clk.Advance(time.Minute)                                               // past the account cache
	w := e.getSession(store.AudienceAdmin, cookie(in, "rotra-admin-access")) // no refresh cookie: that would read as expired
	bodyEquals(t, w, signedOut(store.AudienceAdmin))
}

func TestSessionReadDisplayRowGone(t *testing.T) {
	e := newEnv(t)
	a, in := e.seed(t, store.AudiencePlayer)
	tx, err := e.pool.Begin(e.ctx) // foreign keys off for this transaction: the display row vanishes under a live account
	if err != nil {
		t.Fatal(err)
	}
	for _, q := range []string{`SET LOCAL session_replication_role = replica`, `DELETE FROM players WHERE id = '` + a.accountID.String() + `'`} {
		if _, err := tx.Exec(e.ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	if err := tx.Commit(e.ctx); err != nil {
		t.Fatal(err)
	}
	w := e.getSession(store.AudiencePlayer, in.Result().Cookies()...)
	if w.Body.String() != "null" {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}

func TestSessionReadUnavailable(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	e.pool.Close()
	w := e.getSession(store.AudienceClub, in.Result().Cookies()...)
	if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantHeaders(t, w)
}

func wantCleared(t *testing.T, w *httptest.ResponseRecorder, aud store.Audience) {
	t.Helper()
	for name, path := range map[string]string{session.AccessCookieName(aud): "/", session.RefreshCookieName(aud): session.RefreshCookiePath} {
		c := cookie(w, name)
		if c == nil || c.Value != "" || c.MaxAge >= 0 || c.Path != path || c.Domain != "" {
			t.Errorf("cookie %s not cleared: %+v", name, c)
		}
	}
}

// POST sign-out (sign-in.ts:118-128): always 200, clears both cookies, null or Admin's signed-out object with
// sessionEnded true only for a literal `true` in the body.
func TestSignOut(t *testing.T) {
	for _, aud := range []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin} {
		t.Run(string(aud), func(t *testing.T) {
			e := newEnv(t)
			_, in := e.seed(t, aud)
			w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: string(aud), cookies: in.Result().Cookies()})
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			wantCleared(t, w, aud)
			bodyEquals(t, w, signedOut(aud))
			var reason string
			if err := e.pool.QueryRow(e.ctx, `SELECT revoke_reason FROM auth_sessions`).Scan(&reason); err != nil || reason != "sign_out" {
				t.Fatalf("session not revoked: %q %v", reason, err)
			}
			if e.events(t, store.EventSignOut) != 1 {
				t.Fatal("no sign_out event")
			}
			// the refresh pass no longer works
			r := e.do(req{method: "POST", path: "/api/auth/refresh", app: string(aud), cookies: []*http.Cookie{cookie(in, session.RefreshCookieName(aud))}})
			if r.Code != http.StatusUnauthorized {
				t.Fatalf("refresh after sign-out: %d", r.Code)
			}
			// twice is fine
			if w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: string(aud), cookies: in.Result().Cookies()}); w.Code != http.StatusOK {
				t.Fatalf("second sign-out: %d", w.Code)
			}
		})
	}
}

func TestSignOutSessionEnded(t *testing.T) {
	for body, want := range map[string]bool{
		`{"sessionEnded":true}`: true, `{"sessionEnded":false}`: false, `{"sessionEnded":"true"}`: false,
		`{"sessionEnded":1}`: false, `{}`: false, ``: false, `nope`: false, `null`: false,
	} {
		e := newEnv(t)
		w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "admin", body: body})
		bodyEquals(t, w, map[string]any{"kind": "signed-out", "sessionEnded": want})
	}
	// club and player answer null whatever the body says
	e := newEnv(t)
	if w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "club", body: `{"sessionEnded":true}`}); w.Body.String() != "null" {
		t.Fatalf("%s", w.Body.String())
	}
}

// Nobody signed in, a stale pass, or a pass of another app: still 200 with the cookies cleared and nothing
// revoked. (A refresh cookie does name a session: see TestSignOutFromRefreshCookie.)
func TestSignOutWithoutASession(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudiencePlayer)
	access := cookie(in, "rotra-player-access")
	cases := map[string][]*http.Cookie{
		"no cookies":    nil,
		"garbage":       {{Name: "rotra-player-access", Value: "x.y.z"}},
		"wrong app":     {{Name: "rotra-club-access", Value: access.Value}},
		"expired pass":  nil, // set below
		"stranger pass": {{Name: "rotra-player-access", Value: access.Value + "x"}},
	}
	e.clk.Advance(16 * time.Minute)
	cases["expired pass"] = []*http.Cookie{access}
	for name, cs := range cases {
		w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "player", cookies: cs})
		if w.Code != http.StatusOK || w.Body.String() != "null" {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
		}
		wantCleared(t, w, store.AudiencePlayer)
	}
	if e.count(t, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL`) != 0 {
		t.Fatal("no session may be revoked by these")
	}
}

func TestSignOutBearer(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "club", bearer: cookie(in, "rotra-club-access").Value})
	if w.Code != http.StatusOK || e.count(t, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL`) != 1 {
		t.Fatalf("%d", w.Code)
	}
}

// If the revoke itself fails the session may still be live: 503 and the cookies stay, so the retry works.
func TestSignOutUnavailable(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	e.pool.Close()
	w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "club", cookies: in.Result().Cookies()})
	if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if len(w.Result().Cookies()) != 0 {
		t.Fatal("cookies must stay when the revoke failed")
	}
}

// B-62 amendment: the refresh cookie's Path is /api/auth, so sign-out receives it. With no usable access pass
// (idle past 15 minutes) the session is found by the refresh pass and revoked like any sign-out.
func TestSignOutFromRefreshCookie(t *testing.T) {
	for _, aud := range []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin} {
		t.Run(string(aud), func(t *testing.T) {
			e := newEnv(t)
			_, in := e.seed(t, aud)
			refresh := cookie(in, session.RefreshCookieName(aud))
			if refresh.Path != "/api/auth" {
				t.Fatalf("refresh cookie path %q", refresh.Path)
			}
			e.clk.Advance(16 * time.Minute) // the access pass is gone
			w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: string(aud), cookies: []*http.Cookie{refresh}})
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			wantCleared(t, w, aud)
			bodyEquals(t, w, signedOut(aud))
			var reason string
			if err := e.pool.QueryRow(e.ctx, `SELECT revoke_reason FROM auth_sessions`).Scan(&reason); err != nil || reason != "sign_out" {
				t.Fatalf("session not revoked: %q %v", reason, err)
			}
			if e.events(t, store.EventSignOut) != 1 {
				t.Fatal("no sign_out event")
			}
			if r := e.do(req{method: "POST", path: "/api/auth/refresh", app: string(aud), cookies: []*http.Cookie{refresh}}); r.Code != http.StatusUnauthorized {
				t.Fatalf("refresh after sign-out: %d", r.Code)
			}
			// again: nothing more is written
			if w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: string(aud), cookies: []*http.Cookie{refresh}}); w.Code != http.StatusOK {
				t.Fatalf("second sign-out: %d", w.Code)
			}
			if e.events(t, store.EventSignOut) != 1 {
				t.Fatal("a second sign-out wrote another event")
			}
		})
	}
}

// A refresh pass that matches no session, is malformed, or belongs to another app reveals nothing and revokes
// nothing: the answer and the cleared cookies are the same as for nobody.
func TestSignOutFromRefreshCookieThatNamesNothing(t *testing.T) {
	e := newEnv(t)
	e.seed(t, store.AudiencePlayer)
	e.newClub(t, "other", "Other Club")
	clubIn := e.signIn("club", cred("other", goodPass))
	if clubIn.Code != http.StatusOK {
		t.Fatalf("club sign-in: %d", clubIn.Code)
	}
	unknown := strings.Repeat("A", 43)
	cases := map[string]string{
		"garbage":     "not-a-pass",
		"unknown":     unknown,
		"empty":       "",
		"other app's": cookie(clubIn, "rotra-club-refresh").Value,
	}
	for name, v := range cases {
		w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "player", cookies: []*http.Cookie{{Name: "rotra-player-refresh", Value: v}}})
		if w.Code != http.StatusOK || w.Body.String() != "null" {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
		}
		wantCleared(t, w, store.AudiencePlayer)
	}
	if e.count(t, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL`) != 0 {
		t.Fatal("nothing may be revoked")
	}
}

// The previous refresh pass (inside the B-29 window a tab may still hold it) also names the session.
func TestSignOutFromPreviousRefreshCookie(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	old := cookie(in, "rotra-club-refresh")
	e.clk.Advance(time.Minute)
	if r := e.refreshWith(store.AudienceClub, old); r.Code != http.StatusOK {
		t.Fatalf("refresh: %d", r.Code)
	}
	w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "club", cookies: []*http.Cookie{old}})
	if w.Code != http.StatusOK || e.count(t, `SELECT count(*) FROM auth_sessions WHERE revoke_reason = 'sign_out'`) != 1 {
		t.Fatalf("%d", w.Code)
	}
}

// A good access pass wins; a junk refresh cookie next to it changes nothing.
func TestSignOutPrefersTheAccessPass(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	cs := []*http.Cookie{cookie(in, "rotra-club-access"), {Name: "rotra-club-refresh", Value: "junk"}}
	w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "club", cookies: cs})
	if w.Code != http.StatusOK || e.count(t, `SELECT count(*) FROM auth_sessions WHERE revoke_reason = 'sign_out'`) != 1 {
		t.Fatalf("%d", w.Code)
	}
}

// The lookup by refresh pass failing is a 503 with the cookies left, like a failing revoke.
func TestSignOutFromRefreshCookieUnavailable(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	refresh := cookie(in, "rotra-club-refresh")
	e.pool.Close()
	w := e.do(req{method: "POST", path: "/api/auth/sign-out", app: "club", cookies: []*http.Cookie{refresh}})
	if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if len(w.Result().Cookies()) != 0 {
		t.Fatal("cookies must stay when the revoke failed")
	}
}
