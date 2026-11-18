package session_test

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestCookieNames(t *testing.T) {
	for aud, want := range map[store.Audience][2]string{
		store.AudienceClub:   {"rotra-club-access", "rotra-club-refresh"},
		store.AudiencePlayer: {"rotra-player-access", "rotra-player-refresh"},
		store.AudienceAdmin:  {"rotra-admin-access", "rotra-admin-refresh"},
	} {
		mustEqual(t, "access name", session.AccessCookieName(aud), want[0])
		mustEqual(t, "refresh name", session.RefreshCookieName(aud), want[1])
	}
	mustEqual(t, "refresh path", session.RefreshCookiePath, "/api/auth")
}

func setCookies(r *http.Request, aud store.Audience, c session.Cookies) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	session.SetCookies(rec, r, aud, c)
	return rec
}

func httpsReq() *http.Request {
	r := httptest.NewRequest(http.MethodPost, "https://api.rotra.club/api/auth/sign-in", nil)
	r.TLS = &tls.ConnectionState{}
	return r
}

func TestSetCookiesEmitsTwoSeparateHardenedCookies(t *testing.T) {
	rec := setCookies(httpsReq(), store.AudienceClub, session.Cookies{
		Access: "acc-token", AccessMaxAge: 15 * time.Minute, Refresh: "ref-token", RefreshMaxAge: 30 * 24 * time.Hour,
	})
	lines := rec.Result().Header.Values("Set-Cookie")
	if len(lines) != 2 {
		t.Fatalf("two Set-Cookie lines, never merged into one: %q", lines)
	}
	byName := map[string]*http.Cookie{}
	for _, c := range rec.Result().Cookies() {
		byName[c.Name] = c
	}
	acc, ref := byName["rotra-club-access"], byName["rotra-club-refresh"]
	if acc == nil || ref == nil {
		t.Fatalf("cookies: %v", byName)
	}
	for _, c := range []*http.Cookie{acc, ref} {
		if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode || c.Domain != "" {
			t.Errorf("%s must be HttpOnly, Secure, SameSite=Lax and host-only: %+v", c.Name, c)
		}
	}
	mustEqual(t, "access path", acc.Path, "/")
	mustEqual(t, "refresh path", ref.Path, "/api/auth")
	mustEqual(t, "access value", acc.Value, "acc-token")
	mustEqual(t, "refresh value", ref.Value, "ref-token")
	mustEqual(t, "access Max-Age", acc.MaxAge, 900)
	mustEqual(t, "refresh Max-Age", ref.MaxAge, 30*24*3600)
}

func TestGraceRefreshEmitsOnlyTheAccessCookie(t *testing.T) {
	rec := setCookies(httpsReq(), store.AudiencePlayer, session.Cookies{Access: "acc", AccessMaxAge: 15 * time.Minute})
	lines := rec.Result().Header.Values("Set-Cookie")
	if len(lines) != 1 {
		t.Fatalf("with no refresh pass the refresh cookie is left alone: %q", lines)
	}
	mustEqual(t, "name", rec.Result().Cookies()[0].Name, "rotra-player-access")
}

func TestCookieSecureFlag(t *testing.T) {
	cases := map[string]struct {
		build  func() *http.Request
		secure bool
	}{
		"https": {httpsReq, true},
		"plain http on the real host (Railway terminates TLS in front)": {func() *http.Request {
			return httptest.NewRequest(http.MethodPost, "http://api.rotra.club/x", nil)
		}, true},
		"forwarded https": {func() *http.Request {
			r := httptest.NewRequest(http.MethodPost, "http://api.rotra.club/x", nil)
			r.Header.Set("X-Forwarded-Proto", "https")
			return r
		}, true},
		"plain http localhost":         {func() *http.Request { return httptest.NewRequest(http.MethodPost, "http://localhost:8080/x", nil) }, false},
		"plain http localhost no port": {func() *http.Request { return httptest.NewRequest(http.MethodPost, "http://localhost/x", nil) }, false},
		"plain http 127.0.0.1":         {func() *http.Request { return httptest.NewRequest(http.MethodPost, "http://127.0.0.1:9000/x", nil) }, false},
		"plain http [::1]":             {func() *http.Request { return httptest.NewRequest(http.MethodPost, "http://[::1]:9000/x", nil) }, false},
		"https on localhost stays secure": {func() *http.Request {
			r := httptest.NewRequest(http.MethodPost, "https://localhost:8443/x", nil)
			r.TLS = &tls.ConnectionState{}
			return r
		}, true},
		"a host that only starts like localhost": {func() *http.Request {
			return httptest.NewRequest(http.MethodPost, "http://localhost.evil.test/x", nil)
		}, true},
	}
	for name, c := range cases {
		rec := setCookies(c.build(), store.AudienceClub, session.Cookies{Access: "a", AccessMaxAge: time.Minute, Refresh: "r", RefreshMaxAge: time.Hour})
		for _, ck := range rec.Result().Cookies() {
			if ck.Secure != c.secure {
				t.Errorf("%s: %s Secure=%v, want %v", name, ck.Name, ck.Secure, c.secure)
			}
		}
	}
}

func TestClearCookiesExpiresBothOnTheirOwnPaths(t *testing.T) {
	rec := httptest.NewRecorder()
	session.ClearCookies(rec, httpsReq(), store.AudienceAdmin)
	lines := rec.Result().Header.Values("Set-Cookie")
	if len(lines) != 2 {
		t.Fatalf("%q", lines)
	}
	for _, c := range rec.Result().Cookies() {
		if c.MaxAge >= 0 || c.Value != "" || !c.HttpOnly || c.Domain != "" {
			t.Errorf("%s must be cleared: %+v", c.Name, c)
		}
		switch c.Name {
		case "rotra-admin-access":
			mustEqual(t, "path", c.Path, "/")
		case "rotra-admin-refresh":
			mustEqual(t, "path", c.Path, "/api/auth")
		default:
			t.Errorf("unexpected cookie %s", c.Name)
		}
	}
}

func TestTokenFromRequest(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	mustEqual(t, "none", session.TokenFromRequest(r, store.AudienceClub), "")
	r.AddCookie(&http.Cookie{Name: "rotra-player-access", Value: "from-player-cookie"})
	mustEqual(t, "another app's cookie is not read", session.TokenFromRequest(r, store.AudienceClub), "")
	r.AddCookie(&http.Cookie{Name: "rotra-club-access", Value: "from-cookie"})
	mustEqual(t, "cookie", session.TokenFromRequest(r, store.AudienceClub), "from-cookie")
	r.Header.Set("Authorization", "Bearer from-header")
	mustEqual(t, "header wins", session.TokenFromRequest(r, store.AudienceClub), "from-header")
	r.Header.Set("Authorization", "Basic abc")
	mustEqual(t, "other schemes are ignored", session.TokenFromRequest(r, store.AudienceClub), "from-cookie")
	r.Header.Set("Authorization", "Bearer ")
	mustEqual(t, "an empty bearer is ignored", session.TokenFromRequest(r, store.AudienceClub), "from-cookie")
}
