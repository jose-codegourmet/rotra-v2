package session_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

type apiError struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func serve(h http.Handler, r *http.Request) (*httptest.ResponseRecorder, apiError) {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	var body apiError
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	return rec, body
}

// probe records whether it ran and the principal it saw.
type probe struct {
	called    int
	principal session.Principal
	ok        bool
}

func (p *probe) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.called++
	p.principal, p.ok = session.PrincipalFrom(r.Context())
	w.WriteHeader(http.StatusNoContent)
}

func cookieReq(method string, aud store.Audience, token string) *http.Request {
	r := httptest.NewRequest(method, "/api/x", nil)
	r.AddCookie(&http.Cookie{Name: session.AccessCookieName(aud), Value: token})
	return r
}

func TestMiddlewareAcceptsTheAccessCookieAndSetsThePrincipal(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "mw")
	iss := e.issue(t, club)
	p := &probe{}
	h := e.svc.Authenticator().Require(store.AudienceClub, session.ModeWrite)(p)
	rec, _ := serve(h, cookieReq(http.MethodPost, store.AudienceClub, iss.AccessPass))
	if rec.Code != http.StatusNoContent || p.called != 1 || !p.ok || p.principal.SessionID != iss.Session.ID || p.principal.IdentityID != club.ident.ID {
		t.Fatalf("code %d, probe %+v", rec.Code, p)
	}
	if _, ok := session.PrincipalFrom(httptest.NewRequest(http.MethodGet, "/", nil).Context()); ok {
		t.Fatal("no principal outside the middleware")
	}
}

func TestMiddlewareAcceptsABearerHeaderAndPrefersIt(t *testing.T) {
	e := newEnv(t)
	good, other := e.issue(t, e.newClub(t, "mw1")), e.issue(t, e.newClub(t, "mw2"))
	p := &probe{}
	h := e.svc.Authenticator().Require(store.AudienceClub, session.ModeRead)(p)
	r := httptest.NewRequest(http.MethodGet, "/api/x", nil)
	r.Header.Set("Authorization", "Bearer "+good.AccessPass)
	if rec, _ := serve(h, r); rec.Code != http.StatusNoContent || p.principal.SessionID != good.Session.ID {
		t.Fatalf("bearer: %d %+v", rec.Code, p)
	}
	r = cookieReq(http.MethodGet, store.AudienceClub, other.AccessPass)
	r.Header.Set("Authorization", "Bearer "+good.AccessPass)
	serve(h, r)
	if p.principal.SessionID != good.Session.ID {
		t.Fatalf("the Authorization header wins over the cookie")
	}
	r = httptest.NewRequest(http.MethodGet, "/api/x", nil)
	r.Header.Set("Authorization", "bearer "+good.AccessPass)
	if rec, _ := serve(h, r); rec.Code != http.StatusNoContent {
		t.Fatalf("the scheme is case-insensitive: %d", rec.Code)
	}
}

func TestMiddlewareErrorEnvelopes(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	club := e.newClub(t, "env")
	iss := e.issue(t, club)
	p := &probe{}
	mwRead := auth.Require(store.AudienceClub, session.ModeRead)(p)

	rec, body := serve(mwRead, httptest.NewRequest(http.MethodGet, "/api/x", nil))
	if rec.Code != http.StatusUnauthorized || body.Error.Code != "unauthenticated" {
		t.Fatalf("no pass: %d %+v", rec.Code, body)
	}
	if rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("errors are never cached: %q", rec.Header().Get("Cache-Control"))
	}
	rec, body = serve(mwRead, cookieReq(http.MethodGet, store.AudienceClub, "garbage"))
	if rec.Code != http.StatusUnauthorized || body.Error.Code != "unauthenticated" {
		t.Fatalf("garbage: %d %+v", rec.Code, body)
	}
	rec, body = serve(auth.Require(store.AudiencePlayer, session.ModeRead)(p), cookieReq(http.MethodGet, store.AudiencePlayer, iss.AccessPass))
	if rec.Code != http.StatusForbidden || body.Error.Code != "wrong_account" {
		t.Fatalf("a club pass in the player app: %d %+v", rec.Code, body)
	}
	if p.called != 0 {
		t.Fatal("the handler never runs on a failure")
	}
	e.clk.Advance(16 * time.Minute)
	rec, body = serve(mwRead, cookieReq(http.MethodGet, store.AudienceClub, iss.AccessPass))
	if rec.Code != http.StatusUnauthorized || body.Error.Code != "expired" || body.Error.Message == "" {
		t.Fatalf("expired: %d %+v", rec.Code, body)
	}
}

func TestMiddlewareWriteModeRefusesARevokedSession(t *testing.T) {
	e := newEnv(t)
	iss := e.issue(t, e.newClub(t, "wr"))
	p := &probe{}
	if err := e.svc.SignOut(e.ctx, iss.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	rec, body := serve(e.svc.Authenticator().Require(store.AudienceClub, session.ModeWrite)(p), cookieReq(http.MethodPost, store.AudienceClub, iss.AccessPass))
	if rec.Code != http.StatusUnauthorized || body.Error.Code != "unauthenticated" || p.called != 0 {
		t.Fatalf("%d %+v", rec.Code, body)
	}
	rec, _ = serve(e.svc.Authenticator().Require(store.AudienceClub, session.ModeRead)(p), cookieReq(http.MethodGet, store.AudienceClub, iss.AccessPass))
	if rec.Code != http.StatusNoContent {
		t.Fatalf("read mode trusts the pass: %d", rec.Code)
	}
}

func TestRequireByMethodTreatsEverythingButSafeMethodsAsWrites(t *testing.T) {
	e := newEnv(t)
	iss := e.issue(t, e.newClub(t, "bm"))
	if err := e.svc.SignOut(e.ctx, iss.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	h := e.svc.Authenticator().RequireByMethod(store.AudienceClub)(&probe{})
	for method, want := range map[string]int{
		http.MethodGet: http.StatusNoContent, http.MethodHead: http.StatusNoContent, http.MethodOptions: http.StatusNoContent,
		http.MethodPost: http.StatusUnauthorized, http.MethodPut: http.StatusUnauthorized, http.MethodPatch: http.StatusUnauthorized, http.MethodDelete: http.StatusUnauthorized,
	} {
		if rec, _ := serve(h, cookieReq(method, store.AudienceClub, iss.AccessPass)); rec.Code != want {
			t.Errorf("%s: %d, want %d", method, rec.Code, want)
		}
	}
}

func TestMiddlewareAnswersInternalErrorsWithoutDetails(t *testing.T) {
	e := newEnv(t)
	iss := e.issue(t, e.newClub(t, "db"))
	h := e.svc.Authenticator().Require(store.AudienceClub, session.ModeWrite)(&probe{})
	e.pool.Close() // every lookup now fails
	rec, body := serve(h, cookieReq(http.MethodPost, store.AudienceClub, iss.AccessPass))
	if rec.Code != http.StatusInternalServerError || body.Error.Code != "internal" || body.Error.Message != "Something went wrong." {
		t.Fatalf("%d %+v", rec.Code, body)
	}
}

func TestOptionalReadsNoPassAndBadPassesAsAVisitor(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	p := &probe{}
	h := auth.Optional(store.AudiencePlayer)(p)

	rec, _ := serve(h, httptest.NewRequest(http.MethodGet, "/api/x", nil))
	if rec.Code != http.StatusNoContent || p.called != 1 || p.ok {
		t.Fatalf("no pass is a visitor: %d %+v", rec.Code, p)
	}
	rec, _ = serve(h, cookieReq(http.MethodGet, store.AudiencePlayer, "garbage"))
	if rec.Code != http.StatusNoContent || p.called != 2 || p.ok {
		t.Fatalf("an unverifiable pass is a visitor: %d %+v", rec.Code, p)
	}
	club := e.issue(t, e.newClub(t, "opt-club"))
	rec, _ = serve(h, cookieReq(http.MethodGet, store.AudiencePlayer, club.AccessPass))
	if rec.Code != http.StatusNoContent || p.called != 3 || p.ok {
		t.Fatalf("a pass for another app is a visitor: %d %+v", rec.Code, p)
	}
}

func TestOptionalPutsAValidPrincipalInTheContext(t *testing.T) {
	e := newEnv(t)
	player := e.newPlayer(t, "opt-player@example.com")
	iss := e.issue(t, player)
	p := &probe{}
	h := e.svc.Authenticator().Optional(store.AudiencePlayer)(p)
	rec, _ := serve(h, cookieReq(http.MethodGet, store.AudiencePlayer, iss.AccessPass))
	if rec.Code != http.StatusNoContent || !p.ok || p.principal.AccountID != player.accountID || p.principal.Audience != store.AudiencePlayer {
		t.Fatalf("valid pass: %d %+v", rec.Code, p)
	}
}

func TestOptionalAnswersExpiredNotVisitor(t *testing.T) {
	e := newEnv(t)
	iss := e.issue(t, e.newPlayer(t, "opt-exp@example.com"))
	p := &probe{}
	h := e.svc.Authenticator().Optional(store.AudiencePlayer)(p)
	e.clk.Advance(16 * time.Minute)
	rec, body := serve(h, cookieReq(http.MethodGet, store.AudiencePlayer, iss.AccessPass))
	if rec.Code != http.StatusUnauthorized || body.Error.Code != "expired" || p.called != 0 {
		t.Fatalf("expired: %d %+v called %d", rec.Code, body, p.called)
	}
}

func TestOptionalReadsAnAccountThatCannotSignInAsAVisitor(t *testing.T) {
	e := newEnv(t)
	player := e.newPlayer(t, "opt-disabled@example.com")
	iss := e.issue(t, player)
	e.exec(t, `UPDATE player_accounts SET disabled_at = now() WHERE player_id = $1`, player.accountID)
	p := &probe{}
	h := e.svc.Authenticator().Optional(store.AudiencePlayer)(p)
	rec, _ := serve(h, cookieReq(http.MethodGet, store.AudiencePlayer, iss.AccessPass))
	if rec.Code != http.StatusNoContent || p.ok {
		t.Fatalf("a disabled account reads as a visitor: %d %+v", rec.Code, p)
	}
}

func TestAudienceOfReadsTheAppHeader(t *testing.T) {
	for header, want := range map[string]store.Audience{"club": store.AudienceClub, "player": store.AudiencePlayer, "admin": store.AudienceAdmin} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.Header.Set(session.AppHeader, header)
		if aud, ok := session.AudienceOf(r); !ok || aud != want {
			t.Fatalf("%s: got %q %v", header, aud, ok)
		}
	}
	for _, bad := range []string{"", "Club", "queue", "player "} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		if bad != "" {
			r.Header.Set(session.AppHeader, bad)
		}
		if _, ok := session.AudienceOf(r); ok {
			t.Fatalf("%q must not name an app", bad)
		}
	}
}
