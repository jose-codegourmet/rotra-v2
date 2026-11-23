package google_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func cookieNamed(w *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// The cookie names are the TypeScript's (packages/db/src/auth/google-cookies.ts, GOOGLE_RETURN_COOKIE in @rotra/data), which the
// Player app's pages and proxy read; the golden cases do not compare Set-Cookie, so the names, flags and clearing are pinned here.
func TestTheTripsCookiesHaveTheNamesTheAppReadsAndAreCleared(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	w := b.trip(t, "register", "invite", "/register/x", claims{"email": "new@example.test", "name": "New Person"})
	if flow := cookieNamed(w, "rotra-player-google-flow"); flow == nil || flow.MaxAge >= 0 {
		t.Fatalf("the callback must clear the flow cookie: %+v", flow)
	}
	for name, httpOnly := range map[string]bool{"rotra-player-google-result": true, "rotra-player-google-held": true, "rotra-player-google-return": false} {
		c := cookieNamed(w, name)
		if c == nil || c.HttpOnly != httpOnly || c.SameSite != http.SameSiteLaxMode || !c.Secure || c.MaxAge != 600 || c.Path != "/" {
			t.Fatalf("%s: %+v", name, c)
		}
	}
	if c := cookieNamed(w, "rotra-player-google-return"); c.Value != "invite" {
		t.Fatalf("the page-readable marker holds only the screen key: %q", c.Value)
	}
	// Reading the outcome takes the result and its marker away; the held account stays for the form.
	out := readOutcome(t, b)
	for _, name := range []string{"rotra-player-google-result", "rotra-player-google-return"} {
		if c := cookieNamed(out, name); c == nil || c.MaxAge >= 0 || c.Value != "" {
			t.Fatalf("%s must be cleared: %+v", name, c)
		}
	}
	if cookieNamed(out, "rotra-player-google-held") != nil || !b.has("rotra-player-google-held") {
		t.Fatal("the held Google account stays until the form is sent")
	}
}
