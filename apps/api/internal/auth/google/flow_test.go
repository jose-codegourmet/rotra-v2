package google_test

import (
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

const patGoogle = "pat@example.test"

func accessCookie() string { return session.AccessCookieName(store.AudiencePlayer) }

func wantOutcome(t *testing.T, w *httptest.ResponseRecorder, want obj) {
	t.Helper()
	if w.Code != http.StatusOK {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	got := decode(t, w)
	for k, v := range want {
		if gv, _ := got[k].(string); gv != v {
			t.Fatalf("%s = %v, want %v (body %s)", k, got[k], v, w.Body.String())
		}
	}
}

func readOutcome(t *testing.T, b *browser) *httptest.ResponseRecorder {
	t.Helper()
	return b.do(t, req{method: "POST", path: "/api/auth/google/outcome"})
}

func TestEveryRouteIsNotFoundWhileTheFlagIsOffOrMissing(t *testing.T) {
	e := newEnv(t)
	routes := []req{
		{method: "POST", path: "/api/auth/google/start", body: obj{"intent": "login", "key": "login"}},
		{method: "GET", path: "/api/auth/google/callback?code=x&state=y"},
		{method: "GET", path: "/api/auth/google/outcome"},
		{method: "POST", path: "/api/auth/google/outcome"},
		{method: "POST", path: "/api/auth/google/link", body: obj{}},
		{method: "GET", path: "/api/auth/google/unclaimed?email=a@b.test"},
		{method: "POST", path: "/api/claim/anything/google", body: obj{}},
	}
	for _, label := range []string{"flag missing", "flag off"} {
		if label == "flag off" {
			e.flag(t, false)
		}
		for _, r := range routes {
			w := e.browser().do(t, r)
			if w.Code != http.StatusNotFound {
				t.Errorf("%s: %s %s answered %d", label, r.method, r.path, w.Code)
			}
			if strings.HasPrefix(r.path, "/api/auth/google/callback") && (w.Body.Len() != 0 || w.Header().Get("Cache-Control") != "private, no-store") {
				t.Errorf("%s: the callback must be an empty, uncached 404, got %q %q", label, w.Body.String(), w.Header().Get("Cache-Control"))
			}
		}
	}
}

func TestRoutesAnswerOnlyThePlayerAppBehindTheProxySecret(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	for name, r := range map[string]req{
		"no app header": {method: "POST", path: "/api/auth/google/start", body: obj{"intent": "login", "key": "login"}, noApp: true},
		"no secret":     {method: "POST", path: "/api/auth/google/start", body: obj{"intent": "login", "key": "login"}, noSecret: true},
	} {
		if w := e.browser().do(t, r); w.Code != http.StatusNotFound {
			t.Errorf("%s: %d", name, w.Code)
		}
	}
	b := e.browser()
	w := b.do(t, req{method: "POST", path: "/api/auth/google/start", body: obj{"intent": "login", "key": "login"}})
	if w.Code != http.StatusOK {
		t.Fatalf("the Player app was refused: %d", w.Code)
	}
}

func TestStartValidatesAndReportsAnUnconfiguredGoogle(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	for name, body := range map[string]any{
		"unknown intent": obj{"intent": "admin", "key": "login"},
		"no intent":      obj{"key": "login"},
		"bad key":        obj{"intent": "login", "key": "Not A Key!"},
		"long key":       obj{"intent": "login", "key": strings.Repeat("a", 25)},
		"not an object":  `[1]`,
		"not json":       `nope`,
	} {
		w := e.browser().do(t, req{method: "POST", path: "/api/auth/google/start", body: body})
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
		}
	}
	// connect is for a signed-in player.
	if w := e.browser().do(t, req{method: "POST", path: "/api/auth/google/start", body: obj{"intent": "connect", "key": "connect"}}); w.Code != http.StatusUnauthorized {
		t.Errorf("connect without a session: %d", w.Code)
	}
	// With no Google client configured the start answers "unavailable", and nothing is remembered.
	w := e.browser().doWith(t, e.withoutClient(t), req{method: "POST", path: "/api/auth/google/start", body: obj{"intent": "login", "key": "login"}})
	if w.Code != http.StatusServiceUnavailable || len(w.Result().Cookies()) != 0 {
		t.Errorf("unconfigured: %d, %d cookies", w.Code, len(w.Result().Cookies()))
	}
}

func TestStartRemembersTheTripInASignedCookieAndNeverInTheURL(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	state, nonce := b.startFlow(t, "login", "login", "/me")
	if len(state) < 20 || len(nonce) < 20 || state == nonce {
		t.Fatalf("state %q nonce %q", state, nonce)
	}
	c := b.cookies["rotra-player-google-flow"]
	if c == nil || !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || !c.Secure || c.MaxAge != 600 || c.Path != "/" {
		t.Fatalf("flow cookie %+v", c)
	}
	if strings.Contains(c.Value, state) {
		t.Fatal("the flow cookie must be signed, and the state should not appear as plain text in the URL cookie value")
	}
	// A forged flow cookie is no flow at all.
	forged := e.browser()
	forged.cookies["rotra-player-google-flow"] = &http.Cookie{Name: "rotra-player-google-flow", Value: "eyJrIjoiZmxvdyJ9.AAAA"}
	w := forged.do(t, req{method: "GET", path: "/api/auth/google/callback?code=x&state=y"})
	if w.Code != http.StatusSeeOther || w.Header().Get("Location") != playerBase+"/login" || forged.has("rotra-player-google-result") {
		t.Fatalf("forged flow: %d %q result=%v", w.Code, w.Header().Get("Location"), forged.has("rotra-player-google-result"))
	}
}

func TestLoginWithAConnectedGoogleSignsTheAccountIn(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, _ := e.player(t, playerOpts{email: "pat.rotra@example.test", google: patGoogle})
	b := e.browser()
	w := b.trip(t, "login", "login", "/me", nil)
	if w.Code != http.StatusSeeOther || w.Header().Get("Location") != playerBase+"/me" || w.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("callback: %d %q %q", w.Code, w.Header().Get("Location"), w.Header().Get("Cache-Control"))
	}
	for _, name := range []string{accessCookie(), session.RefreshCookieName(store.AudiencePlayer)} {
		if !b.has(name) {
			t.Fatalf("no %s cookie", name)
		}
	}
	if c := b.cookies["rotra-player-google-return"]; c == nil || c.Value != "login" || c.HttpOnly {
		t.Fatalf("the return marker must be page-readable and hold only the key: %+v", c)
	}
	if strings.Contains(w.Header().Get("Location"), "example.test") || strings.Contains(w.Header().Get("Location"), "code") {
		t.Fatal("no email, code or token in the redirect")
	}
	// The screen asks what happened: the session is real, and the answer is read once.
	if p := b.do(t, req{method: "GET", path: "/api/auth/google/outcome"}); !strings.Contains(p.Body.String(), `"key":"login"`) {
		t.Fatalf("peek: %s", p.Body.String())
	}
	out := readOutcome(t, b)
	wantOutcome(t, out, obj{"outcome": "signed-in"})
	got := decode(t, out)
	if got["session"].(obj)["account"].(obj)["id"] != playerID.String() || got["google"].(obj)["email"] != patGoogle {
		t.Fatalf("outcome: %s", out.Body.String())
	}
	if again := readOutcome(t, b); again.Code != http.StatusUnprocessableEntity {
		t.Fatalf("the outcome is read once: %d", again.Code)
	}
	if e.count(t, `SELECT count(*) FROM auth_sessions WHERE audience = 'player' AND revoked_at IS NULL`) != 1 {
		t.Fatal("exactly one session for the sign-in")
	}
}

func TestADisabledAccountOrAnotherGoogleIsNeverSignedIn(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	e.player(t, playerOpts{email: "off@example.test", google: "off.google@example.test", disabled: true})
	b := e.browser()
	b.trip(t, "login", "login", "/login", claims{"email": "off.google@example.test"})
	if b.has(accessCookie()) {
		t.Fatal("a disabled account got a session")
	}
	if w := b.do(t, req{method: "GET", path: "/api/auth/google/outcome"}); !strings.Contains(w.Body.String(), `"failed"`) {
		t.Fatalf("a failed trip is reported: %s", w.Body.String())
	}
	if w := b.do(t, req{method: "GET", path: "/api/auth/google/outcome"}); !strings.Contains(w.Body.String(), `"waiting":null`) {
		t.Fatalf("and then forgotten: %s", w.Body.String())
	}
}

func TestLoginWithGoogleThatNobodyConnectedNeverCreatesAPlayer(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	b.trip(t, "login", "login", "/login", claims{"email": "stranger@example.test"})
	wantOutcome(t, readOutcome(t, b), obj{"outcome": "not-connected", "triedEmail": "stranger@example.test"})
	if b.has(accessCookie()) || e.count(t, `SELECT count(*) FROM players`) != 0 || b.has("rotra-player-google-held") {
		t.Fatal("nothing is created, signed in or held on /login")
	}
}

func TestAPasswordAccountWithTheSameEmailIsAskedBeforeGoogleIsConnected(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, _ := e.player(t, playerOpts{email: "match@example.test"})
	b := e.browser()
	b.trip(t, "login", "login", "/login", claims{"email": "match@example.test", "name": "Match Person"})
	if b.has(accessCookie()) {
		t.Fatal("never signed in silently")
	}
	out := readOutcome(t, b)
	wantOutcome(t, out, obj{"outcome": "ask-to-connect", "playerId": playerID.String(), "playerName": "Pat Reyes"})
	if got := decode(t, out); got["google"].(obj)["email"] != "match@example.test" {
		t.Fatalf("%s", out.Body.String())
	}
	if e.googleEmailOf(t, playerID) != nil {
		t.Fatal("asking is not connecting")
	}
	// The yes: Google is recorded, the player is signed in, the ROTRA email does not change.
	w := b.do(t, req{method: "POST", path: "/api/auth/google/link", body: obj{"playerId": playerID.String(), "googleEmail": " Match@Example.test "}})
	if w.Code != http.StatusOK || !b.has(accessCookie()) {
		t.Fatalf("link: %d %s", w.Code, w.Body.String())
	}
	if got := e.googleEmailOf(t, playerID); got == nil || *got != "match@example.test" {
		t.Fatalf("google_email = %v", got)
	}
	if e.count(t, `SELECT count(*) FROM player_private_contacts WHERE email = 'match@example.test'`) != 1 {
		t.Fatal("the ROTRA email must not change")
	}
	if b.has("rotra-player-google-held") {
		t.Fatal("the held Google account is gone after the yes")
	}
	if again := b.do(t, req{method: "POST", path: "/api/auth/google/link", body: obj{"playerId": playerID.String(), "googleEmail": "match@example.test"}}); again.Code != http.StatusUnprocessableEntity {
		t.Fatalf("nothing is held for a second yes: %d", again.Code)
	}
}

func TestTheLinkIsRefusedForAnythingButTheHeldAccount(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, _ := e.player(t, playerOpts{email: "match@example.test"})
	otherID, _ := e.player(t, playerOpts{email: "someone.else@example.test"})
	for name, body := range map[string]obj{
		"another player":      {"playerId": otherID.String(), "googleEmail": "match@example.test"},
		"another google":      {"playerId": playerID.String(), "googleEmail": "someone.else@example.test"},
		"no player":           {"googleEmail": "match@example.test"},
		"not an account id":   {"playerId": "nope", "googleEmail": "match@example.test"},
		"the player's number": {"playerId": 7, "googleEmail": "match@example.test"},
	} {
		b := e.browser()
		b.trip(t, "login", "login", "/login", claims{"email": "match@example.test"})
		w := b.do(t, req{method: "POST", path: "/api/auth/google/link", body: body})
		if w.Code != http.StatusForbidden || !strings.Contains(w.Body.String(), "can't be connected here") || b.has(accessCookie()) {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
		}
	}
	if e.googleEmailOf(t, playerID) != nil || e.googleEmailOf(t, otherID) != nil {
		t.Fatal("no refused link may record anything")
	}
	// No held Google account at all: the same failure as any lost trip.
	if w := e.browser().do(t, req{method: "POST", path: "/api/auth/google/link", body: obj{"playerId": playerID.String(), "googleEmail": "match@example.test"}}); w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("nothing held: %d", w.Code)
	}
}

func TestAGoogleEmailAnotherAccountWonMeanwhileIsAConflict(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, _ := e.player(t, playerOpts{email: "match@example.test"})
	b := e.browser()
	b.trip(t, "login", "login", "/login", claims{"email": "match@example.test"})
	e.player(t, playerOpts{email: "racer@example.test", google: "match@example.test"}) // connected between the callback and the yes
	w := b.do(t, req{method: "POST", path: "/api/auth/google/link", body: obj{"playerId": playerID.String(), "googleEmail": "match@example.test"}})
	if w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), "already used by another ROTRA account") || b.has(accessCookie()) {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}

func TestRegisteringWithAnEmailNoAccountHasHoldsItForTheForm(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	b.trip(t, "register", "invite", "/register/x", claims{"email": "new@example.test", "name": "New Person"})
	if b.has(accessCookie()) {
		t.Fatal("a held Google account is not a session")
	}
	out := readOutcome(t, b)
	wantOutcome(t, out, obj{"outcome": "new-account"})
	if got := decode(t, out); got["google"].(obj)["email"] != "new@example.test" || got["google"].(obj)["name"] != "New Person" || got["unclaimed"] != nil {
		t.Fatalf("%s", out.Body.String())
	}
	if !b.has("rotra-player-google-held") {
		t.Fatal("the held Google account stays for the form")
	}
	if e.count(t, `SELECT count(*) FROM players`) != 0 {
		t.Fatal("nothing is created before the form is sent")
	}
}

func TestAClaimWithAnAccountsGoogleOrEmailIsTaken(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	e.player(t, playerOpts{email: "has.google@example.test", google: "has.google@example.test"})
	e.player(t, playerOpts{email: "password.only@example.test"})
	for _, email := range []string{"has.google@example.test", "password.only@example.test"} {
		b := e.browser()
		b.trip(t, "claim", "claim", "/claim/t", claims{"email": email})
		wantOutcome(t, readOutcome(t, b), obj{"outcome": "taken", "email": email})
		if b.has(accessCookie()) || b.has("rotra-player-google-held") {
			t.Fatalf("%s: taken signs nobody in and holds nothing", email)
		}
	}
}

func TestATripThatDidNotFinishDecidesNothing(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	e.player(t, playerOpts{email: "a@example.test", google: patGoogle})
	for name, query := range map[string]func(state, code string) string{
		"another state": func(_, code string) string { return "?code=" + code + "&state=other" },
		"no state":      func(_, code string) string { return "?code=" + code },
		"google error":  func(state, _ string) string { return "?error=access_denied&state=" + state },
		"no code":       func(state, _ string) string { return "?state=" + state },
		"a refused code": func(state, _ string) string {
			return "?code=never-granted&state=" + state
		},
	} {
		b := e.browser()
		state, nonce := b.startFlow(t, "login", "login", "/login")
		code := "g-" + itoa(int(e.seq.Add(1)))
		e.google.grant(code, nonce, e.clk.Now(), nil)
		w := b.do(t, req{method: "GET", path: "/api/auth/google/callback" + query(state, code)})
		if w.Code != http.StatusSeeOther || b.has(accessCookie()) {
			t.Errorf("%s: %d signed=%v", name, w.Code, b.has(accessCookie()))
		}
		if p := b.do(t, req{method: "GET", path: "/api/auth/google/outcome"}); !strings.Contains(p.Body.String(), `"failed"`) {
			t.Errorf("%s: %s", name, p.Body.String())
		}
	}
	// A code that was used cannot be used again, and a flow cookie is single use.
	b := e.browser()
	state, nonce := b.startFlow(t, "login", "login", "/login")
	e.google.grant("once", nonce, e.clk.Now(), nil)
	b.do(t, req{method: "GET", path: "/api/auth/google/callback?code=once&state=" + state})
	if b.has("rotra-player-google-flow") {
		t.Fatal("the flow cookie is cleared by the callback")
	}
}

func TestTheReturnPathIsSameAppAndNeverTheAPI(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	for returnTo, want := range map[string]string{
		"/me":               "/me",
		"/claim/abc?x=1":    "/claim/abc?x=1",
		"//evil.example":    "/login",
		"https://evil.test": "/login",
		`/\evil`:            "/login",
		"/api/me":           "/login",
		"":                  "/login",
		"relative":          "/login",
	} {
		b := e.browser()
		w := b.trip(t, "login", "login", returnTo, claims{"email": "stranger@example.test"})
		if got := w.Header().Get("Location"); got != playerBase+want {
			t.Errorf("returnTo %q went to %q, want %q", returnTo, got, playerBase+want)
		}
	}
}

func TestConnectAndChangeRecordGoogleOnTheSignedInPlayerOnly(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, subject := e.player(t, playerOpts{email: "mine@example.test"})
	otherID, _ := e.player(t, playerOpts{email: "taken@example.test", google: "taken.google@example.test"})
	e.player(t, playerOpts{email: "rotra.of.another@example.test"})

	b := e.browser()
	b.signIn(t, subject, playerID)
	// Connect: the player's own login gets Google.
	b.trip(t, "connect", "connect", "/profile", claims{"email": "mine.google@example.test"})
	wantOutcome(t, readOutcome(t, b), obj{"outcome": "connected"})
	if got := e.googleEmailOf(t, playerID); got == nil || *got != "mine.google@example.test" {
		t.Fatalf("connected: %v", got)
	}
	// The same Google again changes nothing; another Google changes it (Change).
	b.trip(t, "connect", "connect", "/profile", claims{"email": "mine.google@example.test"})
	wantOutcome(t, readOutcome(t, b), obj{"outcome": "connected"})
	b.trip(t, "connect", "connect", "/profile", claims{"email": "changed@example.test"})
	wantOutcome(t, readOutcome(t, b), obj{"outcome": "connected"})
	if got := e.googleEmailOf(t, playerID); got == nil || *got != "changed@example.test" {
		t.Fatalf("changed: %v", got)
	}
	// Another account's Google, and another account's ROTRA email, are refused and change nothing.
	for _, email := range []string{"taken.google@example.test", "rotra.of.another@example.test"} {
		b.trip(t, "connect", "connect", "/profile", claims{"email": email})
		wantOutcome(t, readOutcome(t, b), obj{"outcome": "taken", "email": email})
	}
	if got := e.googleEmailOf(t, playerID); got == nil || *got != "changed@example.test" {
		t.Fatalf("a refused connect changed %v", got)
	}
	if got := e.googleEmailOf(t, otherID); got == nil || *got != "taken.google@example.test" {
		t.Fatalf("the other account changed: %v", got)
	}
	// Connecting never signs anyone else in, and a visitor cannot connect.
	v := e.browser()
	v.trip(t, "login", "login", "/login", claims{"email": "changed@example.test"}) // now a login with the connected Google
	if !v.has(accessCookie()) {
		t.Fatal("the connected Google signs the account in")
	}
}

func TestAConnectTripWithoutTheSessionItStartedWithFails(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, subject := e.player(t, playerOpts{email: "mine@example.test"})
	b := e.browser()
	b.signIn(t, subject, playerID)
	state, nonce := b.startFlow(t, "connect", "connect", "/profile")
	delete(b.cookies, accessCookie()) // signed out meanwhile
	e.google.grant("c1", nonce, e.clk.Now(), claims{"email": "mine.google@example.test"})
	b.do(t, req{method: "GET", path: "/api/auth/google/callback?code=c1&state=" + state})
	if w := b.do(t, req{method: "GET", path: "/api/auth/google/outcome"}); !strings.Contains(w.Body.String(), `"failed"`) {
		t.Fatalf("%s", w.Body.String())
	}
	if e.googleEmailOf(t, playerID) != nil {
		t.Fatal("recorded for a visitor")
	}
}

func TestTheSignedInOutcomeIsCheckedAgainstTheSessionNotTheCookie(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	e.player(t, playerOpts{email: "a@example.test", google: patGoogle})
	b := e.browser()
	b.trip(t, "login", "login", "/login", nil)
	delete(b.cookies, accessCookie()) // the pass is gone: the result cookie alone grants nothing
	if w := readOutcome(t, b); w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("a result cookie must not sign anybody in: %d %s", w.Code, w.Body.String())
	}
}

func TestAHeldAccountThatGotAnAccountMeanwhileIsRefused(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	b.trip(t, "register", "invite", "/register/x", claims{"email": "late@example.test"})
	e.player(t, playerOpts{email: "late@example.test", google: "late@example.test"}) // registered elsewhere before the screen asked
	if w := readOutcome(t, b); w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}

func TestUnclaimedIsOnlyForTheHeldGoogleEmailWithNoAccount(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	b.trip(t, "register", "invite", "/register/x", claims{"email": "new@example.test"})
	get := func(email string) string {
		return b.do(t, req{method: "GET", path: "/api/auth/google/unclaimed?email=" + email}).Body.String()
	}
	if got := get("new@example.test"); got != `{"unclaimed":null}` {
		t.Fatalf("no club saved this email: %s", got)
	}
	// An email that is not the held one, typed or not, reveals nothing; so does a visitor with nothing held.
	if got := get("other@example.test"); got != `{"unclaimed":null}` {
		t.Fatalf("%s", got)
	}
	if got := e.browser().do(t, req{method: "GET", path: "/api/auth/google/unclaimed?email=new@example.test"}).Body.String(); got != `{"unclaimed":null}` {
		t.Fatalf("%s", got)
	}
}

func TestAPasswordSignInNeverOpensALoginMadeWithGoogle(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	e.player(t, playerOpts{email: "g.only@example.test", google: "g.only@example.test", noHash: true})
	b := e.browser()
	w := b.do(t, req{method: "POST", path: "/api/auth/sign-in", body: obj{"identifier": "g.only@example.test", "password": "anything at all"}})
	if w.Code != http.StatusUnauthorized || b.has(accessCookie()) {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}

func TestHavingGoogleClearsTheDeadlineGateHint(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	hint := &http.Cookie{Name: google.GateCookie, Value: "1"}

	// Connect while signed in.
	playerID, subject := e.player(t, playerOpts{email: "mine@example.test"})
	b := e.browser()
	b.signIn(t, subject, playerID)
	b.cookies[google.GateCookie] = hint
	b.trip(t, "connect", "connect", "/profile", claims{"email": "mine.google@example.test"})
	if b.has(google.GateCookie) {
		t.Fatal("connecting Google must clear the hint")
	}
	// Sign in with a connected Google.
	b2 := e.browser()
	b2.cookies[google.GateCookie] = hint
	b2.trip(t, "login", "login", "/me", claims{"email": "mine.google@example.test"})
	if b2.has(google.GateCookie) {
		t.Fatal("signing in with Google must clear the hint")
	}
	// The yes of "Connect Google to your account?".
	pid, _ := e.player(t, playerOpts{email: "asked@example.test"})
	b3 := e.browser()
	b3.cookies[google.GateCookie] = hint
	b3.trip(t, "login", "login", "/login", claims{"email": "asked@example.test"})
	readOutcome(t, b3)
	if w := b3.do(t, req{method: "POST", path: "/api/auth/google/link", body: obj{"playerId": pid.String(), "googleEmail": "asked@example.test"}}); w.Code != http.StatusOK || b3.has(google.GateCookie) {
		t.Fatalf("%d, hint kept=%v", w.Code, b3.has(google.GateCookie))
	}
	// A refused trip leaves the hint alone.
	b4 := e.browser()
	b4.cookies[google.GateCookie] = hint
	b4.trip(t, "login", "login", "/login", claims{"email": "stranger@example.test"})
	if !b4.has(google.GateCookie) {
		t.Fatal("a trip that signed nobody in must not clear the hint")
	}
}

func TestCallbacksAreRateLimitedPerIPApartFromPasswordSignIn(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.Limits.GoogleTripIP = config.AuthLimit{Max: 2, Window: 15 * time.Minute} })
	e.flag(t, true)
	e.player(t, playerOpts{email: "a@example.test", google: patGoogle})
	b := e.browser()
	// Starting is not counted: any number of starts is fine.
	for i := 0; i < 5; i++ {
		b.startFlow(t, "login", "login", "/login")
	}
	if e.count(t, `SELECT count(*) FROM auth_rate_limits`) != 0 {
		t.Fatal("a start must not count")
	}
	// Two callbacks are allowed; the third never goes to Google and decides nothing, even with a good code.
	b.trip(t, "login", "login", "/login", nil)
	b.trip(t, "login", "login", "/login", nil)
	state, nonce := b.startFlow(t, "login", "login", "/login")
	e.google.grant("limited-code", nonce, e.clk.Now(), nil)
	before := len(e.google.tokenHit)
	cb := b.do(t, req{method: "GET", path: "/api/auth/google/callback?code=limited-code&state=" + url.QueryEscape(state)})
	if cb.Code != http.StatusSeeOther || len(e.google.tokenHit) != before {
		t.Fatalf("callback over the limit: %d token hits %d->%d", cb.Code, before, len(e.google.tokenHit))
	}
	// It counted under its own action, never the password sign-in's.
	if e.count(t, `SELECT count(*) FROM auth_rate_limits WHERE action = 'sign_in'`) != 0 || e.count(t, `SELECT count(*) FROM auth_rate_limits WHERE action = 'google_trip'`) != 1 {
		t.Fatal("trips count under google_trip only")
	}
	// The next window is free again.
	e.clk.Advance(16 * time.Minute)
	b.trip(t, "login", "login", "/login", nil)
}

func TestAGoogleSignInIsAuditedLikeAPasswordSignIn(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	playerID, subject := e.player(t, playerOpts{email: "a@example.test", google: patGoogle})
	b := e.browser()
	b.trip(t, "login", "login", "/me", nil)
	if !b.has(accessCookie()) {
		t.Fatal("signed in")
	}
	// Issue writes the sign_in event with the identity, the session and the client IP, as the password sign-in does.
	if e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'sign_in' AND identity_id = $1 AND session_id IS NOT NULL AND ip IS NOT NULL AND audience = 'player'`, subject) != 1 {
		t.Fatal("one sign_in event with the session and the IP")
	}
	if e.count(t, `SELECT count(*) FROM auth_sessions WHERE identity_id = $1 AND audience = 'player' AND created_ip IS NOT NULL`, subject) != 1 {
		t.Fatal("the session records its IP")
	}
	_ = playerID
}
