package recovery_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
)

// What every answer of the two routes carries (handler.ts PRIVATE_HEADERS).
func wantPrivateJSON(t testing.TB, w *httptest.ResponseRecorder) {
	t.Helper()
	for h, want := range map[string]string{"Cache-Control": "private, no-store", "Vary": "Cookie", "Content-Type": "application/json"} {
		if got := w.Header().Get(h); got != want {
			t.Errorf("%s: %q, want %q", h, got, want)
		}
	}
}

func TestRoutesAreForThePlayerAppOnly(t *testing.T) {
	e := newEnv(t)
	for _, path := range []string{"/api/auth/password-reset", "/api/auth/reset-password"} {
		for name, mut := range map[string]func(*req){
			"club app":     func(r *req) { r.app = "club" },
			"admin app":    func(r *req) { r.app = "admin" },
			"unknown app":  func(r *req) { r.app = "other" },
			"no app":       func(r *req) { r.noApp = true },
			"upper case":   func(r *req) { r.app = "Player" },
			"no secret":    func(r *req) { r.noSecret = true },
			"both missing": func(r *req) { r.noApp, r.noSecret = true, true },
		} {
			t.Run(path+" "+name, func(t *testing.T) {
				r := req{method: "POST", path: path, body: jsonBody(obj{"email": "a@b.co", "token": "x", "password": goodPass}), ip: "203.0.113.9"}
				mut(&r)
				w := e.do(r)
				wantErr(t, w, http.StatusNotFound, "not_found", nil)
			})
		}
	}
	// Refused before anything is counted.
	if n := e.count(t, `SELECT count(*) FROM auth_rate_limits`); n != 0 {
		t.Fatalf("%d rate limit rows after refused requests", n)
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests`); n != 0 {
		t.Fatal("a refused request saved something")
	}
}

func TestForgotAnswersTheSameForEveryEmail(t *testing.T) {
	e := newEnv(t)
	for name, email := range map[string]string{
		"eligible":   e.player(t, acctOpts{}).email,
		"unknown":    "nobody@example.test",
		"disabled":   e.player(t, acctOpts{disabled: true}).email,
		"supabase":   e.player(t, acctOpts{provider: "supabase"}).email,
		"upper case": strings.ToUpper(e.player(t, acctOpts{}).email),
	} {
		t.Run(name, func(t *testing.T) {
			w := e.forgot(jsonBody(obj{"email": email}))
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantJSON(t, w, obj{"acknowledged": true})
			wantPrivateJSON(t, w)
			if len(w.Result().Cookies()) != 0 {
				t.Fatal("a cookie was set")
			}
		})
	}
	// Repeating it is the same answer and still one request.
	w := e.forgot(jsonBody(obj{"email": "nobody@example.test"}))
	wantJSON(t, w, obj{"acknowledged": true})
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE email = 'nobody@example.test'`); n != 1 {
		t.Fatalf("%d requests", n)
	}
}

func TestForgotValidation(t *testing.T) {
	e := newEnv(t)
	emailMsg := map[string]string{"email": "Enter an email address, like name@example.com."}
	for name, body := range map[string]string{
		"no email":      jsonBody(obj{}),
		"not a string":  jsonBody(obj{"email": 42}),
		"null":          jsonBody(obj{"email": nil}),
		"no at":         jsonBody(obj{"email": "name.example"}),
		"no dot":        jsonBody(obj{"email": "name@example"}),
		"too long":      jsonBody(obj{"email": strings.Repeat("a", 250) + "@b.co"}),
		"spaces inside": jsonBody(obj{"email": "na me@example.test"}),
	} {
		t.Run(name, func(t *testing.T) {
			wantErr(t, e.forgot(body), http.StatusUnprocessableEntity, "invalid", emailMsg)
		})
	}
	// A body that is not a JSON object is a plain invalid (readJsonBody).
	huge := `{"email":"` + strings.Repeat("a", 20000) + `@b.co"}`
	for name, body := range map[string]string{"array": `[1]`, "string": `"x"`, "null body": `null`, "broken": `{"email":`, "empty": ``, "over 16 KiB": huge} {
		t.Run(name, func(t *testing.T) {
			wantErr(t, e.forgot(body), http.StatusUnprocessableEntity, "invalid", nil)
		})
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests`); n != 0 {
		t.Fatal("a refused request saved something")
	}
}

func TestResetRoute(t *testing.T) {
	e := newEnv(t)
	a, _, token, _ := e.resetFor(t, acctOpts{})
	// Refusals first: none of them spends the link or sets a cookie.
	wantErr(t, e.reset(jsonBody(obj{"token": token, "password": ""})), 422, "invalid", map[string]string{"password": "Enter a new password."})
	wantErr(t, e.reset(jsonBody(obj{"token": token})), 422, "invalid", map[string]string{"password": "Enter a new password."})
	wantErr(t, e.reset(jsonBody(obj{"token": token, "password": "short"})), 422, "invalid", map[string]string{"password": "Use at least 6 characters."})
	wantErr(t, e.reset(jsonBody(obj{"password": newPass})), 403, "forbidden", linkGone)
	wantErr(t, e.reset(jsonBody(obj{"token": 42, "password": newPass})), 403, "forbidden", linkGone)
	wantErr(t, e.reset(jsonBody(obj{"token": "not-a-token", "password": newPass})), 403, "forbidden", linkGone)
	wantErr(t, e.reset(`[1]`), 422, "invalid", nil)
	wantErr(t, e.reset(`{"token":`), 422, "invalid", nil)

	w := e.reset(jsonBody(obj{"token": token, "password": newPass}))
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantJSON(t, w, obj{"saved": true})
	wantPrivateJSON(t, w)
	if len(w.Result().Cookies()) != 0 || w.Header().Get("Set-Cookie") != "" {
		t.Fatal("a reset must not sign anyone in: no cookie")
	}
	if n := e.sessions(t, a.identity, `AND revoked_at IS NULL`); n != 0 {
		t.Fatal("a session exists after a reset")
	}
	// The same link again, and the old password.
	wantErr(t, e.reset(jsonBody(obj{"token": token, "password": newPass})), 403, "forbidden", linkGone)
	if w := e.signIn(a.email, goodPass); w.Code != http.StatusUnauthorized {
		t.Fatalf("old password: %d", w.Code)
	}
	if w := e.signIn(a.email, newPass); w.Code != http.StatusOK {
		t.Fatalf("new password: %d", w.Code)
	}
}

// The whole journey through the routes, with the Admin step in the middle.
func TestRecoveryJourney(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	wantJSON(t, e.forgot(jsonBody(obj{"email": a.email})), obj{"acknowledged": true})
	page, err := e.rec.ReadRequests(e.ctx, 1)
	if err != nil || len(page.Rows) != 1 || !page.Rows[0].CanIssue {
		t.Fatalf("%v %+v", err, page)
	}
	res, err := e.rec.Review(e.ctx, admin, page.Rows[0].ID, recovery.ReviewInput{Action: "issue", OwnershipVerified: true})
	if err != nil {
		t.Fatal(err)
	}
	if w := e.reset(jsonBody(obj{"token": *res.Token, "password": newPass})); w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if w := e.signIn(a.email, newPass); w.Code != http.StatusOK {
		t.Fatalf("%d", w.Code)
	}
}

// A failure that is not the caller's is the TypeScript's 503 copy, and the link is not spent.
func TestResetRouteUnavailable(t *testing.T) {
	e := newEnv(t)
	_, id, token, _ := e.resetFor(t, acctOpts{})
	e.exec(t, `ALTER TABLE auth_events ADD CONSTRAINT no_reset_used CHECK (event <> 'password_reset_used')`)
	w := e.reset(jsonBody(obj{"token": token, "password": newPass}))
	wantErr(t, w, http.StatusServiceUnavailable, "unavailable", map[string]string{"link": "The reset could not be completed. Request another reset link."})
	if r := e.request(t, id); r.digest == nil {
		t.Fatal("the link was spent")
	}
}

// R4: 30 reset requests per hour per IP, one budget for both routes; another IP is not affected; the window ends.
func TestRoutesRateLimit(t *testing.T) {
	e := newEnv(t)
	ip := fromIP("203.0.113.50")
	for i := range 15 {
		if w := e.forgot(jsonBody(obj{"email": fmt.Sprintf("p%d@example.test", i)}), ip); w.Code != 200 {
			t.Fatalf("submit %d: %d", i, w.Code)
		}
	}
	for i := range 15 {
		if w := e.reset(jsonBody(obj{"token": "x", "password": newPass}), ip); w.Code != 403 {
			t.Fatalf("reset %d: %d", i, w.Code)
		}
	}
	for name, w := range map[string]*httptest.ResponseRecorder{
		"submit": e.forgot(jsonBody(obj{"email": "late@example.test"}), ip),
		"reset":  e.reset(jsonBody(obj{"token": "x", "password": newPass}), ip),
	} {
		if w.Code != http.StatusTooManyRequests {
			t.Fatalf("%s: %d, want 429", name, w.Code)
		}
		if w.Header().Get("Retry-After") == "" {
			t.Fatalf("%s: no Retry-After", name)
		}
		wantJSON(t, w, obj{"error": obj{"code": "rate_limited", "message": "Too many requests. Try again in a minute."}})
		if len(w.Result().Cookies()) != 0 {
			t.Fatal("cookie on a 429")
		}
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE email = 'late@example.test'`); n != 0 {
		t.Fatal("a limited request was saved")
	}
	if w := e.forgot(jsonBody(obj{"email": "other@example.test"}), fromIP("203.0.113.51")); w.Code != 200 {
		t.Fatalf("another IP: %d", w.Code)
	}
	e.clk.Advance(time.Hour)
	if w := e.forgot(jsonBody(obj{"email": "later@example.test"}), ip); w.Code != 200 {
		t.Fatalf("after the window: %d", w.Code)
	}
}

// Invalid bodies count too: the attempt is counted before the body is read.
func TestRoutesCountBeforeReadingTheBody(t *testing.T) {
	e := newEnv(t)
	ip := fromIP("203.0.113.60")
	for range 30 {
		e.forgot(`not json`, ip)
	}
	if w := e.forgot(jsonBody(obj{"email": "ok@example.test"}), ip); w.Code != http.StatusTooManyRequests {
		t.Fatalf("%d", w.Code)
	}
}

func TestRoutesFailClosedWhenTheLimiterFails(t *testing.T) {
	e := newEnv(t)
	e.exec(t, `ALTER TABLE auth_rate_limits RENAME TO auth_rate_limits_gone`)
	w := e.forgot(jsonBody(obj{"email": "ok@example.test"}))
	wantErr(t, w, http.StatusServiceUnavailable, "unavailable", nil)
}

func TestRoutesAnswer500ForAnUnexpectedFailure(t *testing.T) {
	e := newEnv(t)
	e.exec(t, `ALTER TABLE player_password_reset_requests RENAME TO player_password_reset_requests_gone`)
	w := e.forgot(jsonBody(obj{"email": "ok@example.test"}))
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantJSON(t, w, obj{"error": obj{"code": "internal", "message": "Something went wrong."}})
}

// With player_google_sign_in on (P12, #922), an account that signs in with Google and has no password answers signsInWithGoogle and
// makes no request for Admin review: there is no password to reset. Everything else, and the flag off, is the plain acknowledgement.
func TestForgotTellsAGoogleOnlyAccountToUseGoogle(t *testing.T) {
	e := newEnv(t)
	flag := func(on bool) {
		e.exec(t, `INSERT INTO feature_flags (key, name, description, value, updated_at) VALUES ('player_google_sign_in', 'g', 't', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, on)
	}
	googleOnly := e.player(t, acctOpts{google: "g.only@example.test", noPassword: true})
	withPassword := e.player(t, acctOpts{google: "both@example.test"})
	disabled := e.player(t, acctOpts{google: "off@example.test", noPassword: true, disabled: true})
	noGoogle := e.player(t, acctOpts{noPassword: true})
	ask := func(email string) string {
		w := e.do(req{method: "POST", path: "/api/auth/password-reset", app: "player", body: jsonBody(obj{"email": email}), ip: "203.0.113.9"})
		if w.Code != http.StatusOK {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		return strings.TrimSpace(w.Body.String())
	}
	requests := func() int { return e.count(t, `SELECT count(*) FROM player_password_reset_requests`) }

	// Flag off, or missing: exactly the acknowledgement of every other address, and a request is saved.
	if got := ask(googleOnly.email); got != `{"acknowledged":true}` || requests() != 1 {
		t.Fatalf("flag missing: %s, %d requests", got, requests())
	}
	flag(false)
	e.exec(t, `DELETE FROM player_password_reset_requests`)
	if got := ask(googleOnly.email); got != `{"acknowledged":true}` || requests() != 1 {
		t.Fatalf("flag off: %s, %d requests", got, requests())
	}
	e.exec(t, `DELETE FROM player_password_reset_requests`)
	flag(true)
	if got := ask(googleOnly.email); got != `{"acknowledged":true,"signsInWithGoogle":true}` || requests() != 0 {
		t.Fatalf("flag on: %s, %d requests", got, requests())
	}
	if got := ask(strings.ToUpper(googleOnly.email)); got != `{"acknowledged":true,"signsInWithGoogle":true}` {
		t.Fatalf("the address is normalized: %s", got)
	}
	for name, a := range map[string]acct{"has a password": withPassword, "disabled": disabled, "no Google": noGoogle} {
		if got := ask(a.email); got != `{"acknowledged":true}` || requests() == 0 {
			t.Fatalf("%s: %s", name, got)
		}
		e.exec(t, `DELETE FROM player_password_reset_requests`)
	}
}
