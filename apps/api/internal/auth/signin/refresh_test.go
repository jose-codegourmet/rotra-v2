package signin_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

func (e *env) refreshWith(aud store.Audience, c *http.Cookie) *httptest.ResponseRecorder {
	var cs []*http.Cookie
	if c != nil {
		cs = []*http.Cookie{c}
	}
	return e.do(req{method: "POST", path: "/api/auth/refresh", app: string(aud), cookies: cs})
}

// POST refresh: 200 { ok: true } with a new access pass and a rotated refresh pass; club and player sessions
// are extended on use, Admin's is not (B-27).
func TestRefresh(t *testing.T) {
	for _, aud := range []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin} {
		t.Run(string(aud), func(t *testing.T) {
			e := newEnv(t)
			a, in := e.seed(t, aud)
			old := cookie(in, session.RefreshCookieName(aud))
			before := e.count(t, `SELECT count(*) FROM auth_events`)
			var exp0 time.Time
			_ = e.pool.QueryRow(e.ctx, `SELECT expires_at FROM auth_sessions`).Scan(&exp0)
			e.clk.Advance(20 * time.Minute)
			w := e.refreshWith(aud, old)
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			bodyEquals(t, w, map[string]any{"ok": true})
			access, fresh := cookie(w, session.AccessCookieName(aud)), cookie(w, session.RefreshCookieName(aud))
			if access == nil || fresh == nil || fresh.Value == old.Value || fresh.Path != session.RefreshCookiePath || access.Path != "/" {
				t.Fatalf("cookies: %+v %+v", access, fresh)
			}
			left := session.RefreshLifetime(aud) // Admin's 12 hours are not extended: 20 minutes are gone
			if !session.ExtendsOnUse(aud) {
				left -= 20 * time.Minute
			}
			if access.MaxAge != int(left/time.Second) || fresh.MaxAge != int(left/time.Second) {
				t.Errorf("Max-Age %d %d, want %d", access.MaxAge, fresh.MaxAge, int(left/time.Second))
			}
			if c, err := e.verifier.Verify(access.Value, pass.Audience(aud), e.clk.Now()); err != nil || c.AccountID != a.accountID.String() {
				t.Fatalf("access pass: %+v %v", c, err)
			}
			var exp1 time.Time
			_ = e.pool.QueryRow(e.ctx, `SELECT expires_at FROM auth_sessions`).Scan(&exp1)
			if extended := exp1.After(exp0); extended != session.ExtendsOnUse(aud) {
				t.Errorf("extended on use: %v, want %v", extended, session.ExtendsOnUse(aud))
			}
			if e.count(t, `SELECT count(*) FROM auth_events`) != before {
				t.Error("a routine refresh writes no event (B-34)")
			}
		})
	}
}

// B-29: the previous pass inside the grace window gets an access pass only and leaves the refresh cookie alone;
// after the window it is reuse: the session is revoked and the cookies cleared.
func TestRefreshGraceAndReuse(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudiencePlayer)
	old := cookie(in, "rotra-player-refresh")
	if w := e.refreshWith(store.AudiencePlayer, old); w.Code != http.StatusOK {
		t.Fatalf("first: %d", w.Code)
	}
	e.clk.Advance(10 * time.Second)
	w := e.refreshWith(store.AudiencePlayer, old)
	if w.Code != http.StatusOK || cookie(w, "rotra-player-access") == nil || cookie(w, "rotra-player-refresh") != nil {
		t.Fatalf("grace: %d %v", w.Code, w.Result().Cookies())
	}
	// The refresh cookie is left alone, but the access cookie must still live as long as it: the remaining
	// 30 days of the session, 10 seconds after the first refresh extended it (B-62 amendment).
	if got, want := cookie(w, "rotra-player-access").MaxAge, int((session.RefreshLifetime(store.AudiencePlayer) - 10*time.Second).Seconds()); got != want {
		t.Fatalf("grace access Max-Age %d, want %d", got, want)
	}
	e.clk.Advance(time.Minute)
	w = e.refreshWith(store.AudiencePlayer, old)
	if code, _ := errBody(t, w); w.Code != http.StatusUnauthorized || code != "unauthenticated" {
		t.Fatalf("reuse: %d %s", w.Code, w.Body.String())
	}
	wantCleared(t, w, store.AudiencePlayer)
	if e.events(t, store.EventRefreshReused) != 1 || e.count(t, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL`) != 1 {
		t.Fatal("reuse must revoke the session and log it")
	}
}

func TestRefreshRefusals(t *testing.T) {
	t.Run("no cookie and garbage", func(t *testing.T) {
		e := newEnv(t)
		for _, c := range []*http.Cookie{nil, {Name: "rotra-club-refresh", Value: "garbage"}, {Name: "rotra-club-refresh", Value: ""}} {
			w := e.refreshWith(store.AudienceClub, c)
			if code, _ := errBody(t, w); w.Code != http.StatusUnauthorized || code != "unauthenticated" {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			wantCleared(t, w, store.AudienceClub)
		}
	})
	t.Run("signed-out session", func(t *testing.T) {
		e := newEnv(t)
		_, in := e.seed(t, store.AudienceClub)
		e.exec(t, `UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'sign_out'`)
		w := e.refreshWith(store.AudienceClub, cookie(in, "rotra-club-refresh"))
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("%d", w.Code)
		}
		wantCleared(t, w, store.AudienceClub)
	})
	t.Run("account disabled", func(t *testing.T) {
		e := newEnv(t)
		_, in := e.seed(t, store.AudiencePlayer)
		e.exec(t, `UPDATE player_accounts SET disabled_at = now()`)
		w := e.refreshWith(store.AudiencePlayer, cookie(in, "rotra-player-refresh"))
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("%d", w.Code)
		}
		wantCleared(t, w, store.AudiencePlayer)
	})
	t.Run("a pass of another app", func(t *testing.T) {
		e := newEnv(t)
		_, in := e.seed(t, store.AudienceClub)
		stolen := &http.Cookie{Name: "rotra-player-refresh", Value: cookie(in, "rotra-club-refresh").Value}
		w := e.refreshWith(store.AudiencePlayer, stolen)
		if w.Code != http.StatusUnauthorized || cookie(w, "rotra-player-access") == nil || cookie(w, "rotra-player-access").Value != "" {
			t.Fatalf("%d %v", w.Code, w.Result().Cookies())
		}
	})
}

// NEW (R4): refresh is limited per IP and per session; the 429 keeps the cookies. The service counts the IP
// once per call (a double count would halve the limit).
func TestRefreshRateLimits(t *testing.T) {
	t.Run("per IP, counted once", func(t *testing.T) {
		e := newEnv(t, func(c *config.AuthTuning) { c.Limits.RefreshIP = config.AuthLimit{Max: 3, Window: time.Minute} })
		_, in := e.seed(t, store.AudienceClub)
		c := cookie(in, "rotra-club-refresh")
		for i := range 3 {
			w := e.refreshWith(store.AudienceClub, c)
			if w.Code != http.StatusOK {
				t.Fatalf("call %d: %d %s", i+1, w.Code, w.Body.String())
			}
			c = cookie(w, "rotra-club-refresh")
		}
		w := e.refreshWith(store.AudienceClub, c)
		if code, _ := errBody(t, w); w.Code != http.StatusTooManyRequests || code != "rate_limited" || w.Header().Get("Retry-After") == "" {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		wantHeaders(t, w)
		if len(w.Result().Cookies()) != 0 {
			t.Fatal("a limited refresh must not touch the cookies")
		}
	})
	t.Run("per session", func(t *testing.T) {
		e := newEnv(t, func(c *config.AuthTuning) { c.Limits.RefreshSession = config.AuthLimit{Max: 1, Window: time.Minute} })
		_, in := e.seed(t, store.AudienceClub)
		c := cookie(in, "rotra-club-refresh")
		first := e.refreshWith(store.AudienceClub, c)
		w := e.refreshWith(store.AudienceClub, cookie(first, "rotra-club-refresh"))
		if w.Code != http.StatusTooManyRequests || len(w.Result().Cookies()) != 0 {
			t.Fatalf("%d %v", w.Code, w.Result().Cookies())
		}
	})
}

func TestRefreshUnavailable(t *testing.T) {
	e := newEnv(t)
	_, in := e.seed(t, store.AudienceClub)
	e.pool.Close()
	w := e.refreshWith(store.AudienceClub, cookie(in, "rotra-club-refresh"))
	if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if len(w.Result().Cookies()) != 0 {
		t.Fatal("a failed refresh must leave the cookies alone")
	}
}
