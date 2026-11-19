package signedin_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

var testNow = time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC)

func TestRouterGivesEachAppItsOwnHandlerForOnePath(t *testing.T) {
	rt := signedin.NewRouter()
	for aud, body := range map[store.Audience]string{store.AudienceClub: "club", store.AudiencePlayer: "player"} {
		rt.Handle("GET /api/shared/{id}", aud, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte(body + ":" + r.PathValue("id")))
		}))
	}
	mux := http.NewServeMux()
	rt.Mount(mux)
	get := func(app string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodGet, "/api/shared/7", nil)
		if app != "" {
			r.Header.Set("X-Rotra-App", app)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}
	if w := get("club"); w.Body.String() != "club:7" {
		t.Fatalf("club: %q", w.Body.String())
	}
	if w := get("player"); w.Body.String() != "player:7" {
		t.Fatalf("player: %q", w.Body.String())
	}
	for _, app := range []string{"", "admin", "queue", "Player"} {
		w := get(app)
		if w.Code != http.StatusNotFound || w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatalf("app %q: %d %q", app, w.Code, w.Body.String())
		}
	}
}

func TestRouterRefusesTheSameAppTwice(t *testing.T) {
	rt := signedin.NewRouter()
	rt.Handle("GET /api/x", store.AudienceClub, http.NotFoundHandler())
	defer func() {
		if recover() == nil {
			t.Fatal("a second handler for the same pattern and app must panic")
		}
	}()
	rt.Handle("GET /api/x", store.AudienceClub, http.NotFoundHandler())
}

func TestRegisterNeedsAPoolAndAnAuthenticator(t *testing.T) {
	if _, err := signedin.Register(signedin.Deps{}); err == nil {
		t.Fatal("no pool and no authenticator is a wiring mistake")
	}
}

func TestPlayerReadsRefuseWhatIsNotAPlayerPass(t *testing.T) {
	e := newEnv(t, testNow)
	e.loadSeed(t, "player.seed.sql")
	e.relinkPlayers(t, nil)
	const path = "/api/me/clubs"
	alice := "f2000000-0000-4000-8000-000000000001"

	cases := []struct {
		name string
		req  req
		code int
		err  string
	}{
		{"no proxy secret", req{path: path, app: "player", bearer: e.accessPass(t, alice), noSecret: true}, 404, "not_found"},
		{"no app header", req{path: path, bearer: e.accessPass(t, alice)}, 404, "not_found"},
		{"unknown app", req{path: path, app: "queue", bearer: e.accessPass(t, alice)}, 404, "not_found"},
		{"another app has no such path", req{path: path, app: "club", bearer: e.accessPass(t, alice)}, 404, "not_found"},
		{"no pass", req{path: path, app: "player"}, 401, "unauthenticated"},
		{"garbage pass", req{path: path, app: "player", bearer: "garbage"}, 401, "unauthenticated"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			w := e.do(c.req)
			if w.Code != c.code || errCode(t, w) != c.err {
				t.Fatalf("got %d %s, want %d %s", w.Code, w.Body.String(), c.code, c.err)
			}
		})
	}

	t.Run("expired pass", func(t *testing.T) {
		pass := e.accessPass(t, alice)
		e.clk.Set(testNow.Add(16 * time.Minute))
		w := e.do(req{path: path, app: "player", bearer: pass})
		if w.Code != 401 || errCode(t, w) != "expired" {
			t.Fatalf("got %d %s", w.Code, w.Body.String())
		}
	})
}

func TestPlayerReadsServeOnlyGET(t *testing.T) {
	e := newEnv(t, testNow)
	for _, m := range []string{http.MethodPost, http.MethodPatch, http.MethodDelete} {
		r := httptest.NewRequest(m, "/api/me/clubs", nil)
		r.Header.Set("X-Rotra-Proxy-Secret", secret)
		r.Header.Set("X-Rotra-App", "player")
		w := httptest.NewRecorder()
		e.handler.ServeHTTP(w, r)
		if w.Code == http.StatusOK {
			t.Fatalf("%s must not read: %d", m, w.Code)
		}
	}
}

func TestAReadThatFailsAnswersTheUnexpectedErrorBody(t *testing.T) {
	e := newEnv(t, testNow)
	e.loadSeed(t, "player.seed.sql")
	e.relinkPlayers(t, nil)
	pass := e.accessPass(t, "f2000000-0000-4000-8000-000000000001")
	e.pool.Close() // every query now fails; the answer must not leak why
	w := e.do(req{path: "/api/me/clubs", app: "player", bearer: pass})
	if w.Code != http.StatusInternalServerError || errCode(t, w) != "internal" {
		t.Fatalf("got %d %s", w.Code, w.Body.String())
	}
}
