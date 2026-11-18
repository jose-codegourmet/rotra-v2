package signin_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/signin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestRegisterNeedsItsParts(t *testing.T) {
	e := newEnv(t)
	for name, d := range map[string]signin.Deps{
		"no service":  {Store: e.st, Verifier: e.verifier},
		"no store":    {Service: e.svc, Verifier: e.verifier},
		"no verifier": {Service: e.svc, Store: e.st},
	} {
		if _, err := signin.Register(d); err == nil {
			t.Errorf("%s: want an error", name)
		}
	}
}

// Without the optional clock and logger the routes still work; without the proxy guard there is no client IP
// and the sign-in still counts and succeeds.
func TestDefaultsAndNoClientIP(t *testing.T) {
	e := newEnv(t)
	a := e.newPlayer(t, "ana@example.com", "Ana Reyes")
	register, err := signin.Register(signin.Deps{Service: e.svc, Store: e.st, Verifier: e.verifier})
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	register(mux)
	r := httptest.NewRequest("POST", "/api/auth/sign-in", strings.NewReader(cred("ana@example.com", goodPass)))
	r.Header.Set(signin.AppHeader, "player")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	var ip *string
	if err := e.pool.QueryRow(e.ctx, `SELECT host(created_ip) FROM auth_sessions WHERE identity_id = $1`, a.ident.ID).Scan(&ip); err != nil || ip != nil {
		t.Fatalf("created_ip %v %v", ip, err)
	}
}

func TestOversizedBodyIsEmpty(t *testing.T) {
	e := newEnv(t)
	w := e.signIn("club", `{"identifier":"a","password":"`+strings.Repeat("x", 20<<10)+`"}`)
	if code, _ := errBody(t, w); w.Code != http.StatusUnprocessableEntity || code != "invalid" {
		t.Fatalf("%d", w.Code)
	}
}

// A row that vanished or broke between the steps never signs anyone in.
func TestSignInDataFaults(t *testing.T) {
	t.Run("the club's display row is gone", func(t *testing.T) {
		e := newEnv(t)
		a := e.newClub(t, "smash", "Smash")
		tx, err := e.pool.Begin(e.ctx)
		if err != nil {
			t.Fatal(err)
		}
		for _, q := range []string{`SET LOCAL session_replication_role = replica`, `DELETE FROM clubs WHERE id = '` + a.accountID.String() + `'`} {
			if _, err := tx.Exec(e.ctx, q); err != nil {
				t.Fatal(err)
			}
		}
		if err := tx.Commit(e.ctx); err != nil {
			t.Fatal(err)
		}
		e.wantRefused(t, e.signIn("club", cred("smash", goodPass)), store.AudienceClub)
	})
	t.Run("the account lookup fails", func(t *testing.T) {
		e := newEnv(t)
		e.newPlayer(t, "ana@example.com", "Ana")
		e.exec(t, `ALTER TABLE player_accounts RENAME TO player_accounts_gone`)
		w := e.signIn("player", cred("ana@example.com", goodPass))
		if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
	})
	t.Run("the identity lookup fails after the limiter", func(t *testing.T) {
		e := newEnv(t)
		e.exec(t, `ALTER TABLE auth_identities RENAME TO auth_identities_gone`)
		w := e.signIn("player", cred("ana@example.com", goodPass))
		if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
	})
	t.Run("recording the wrong password fails", func(t *testing.T) {
		e := newEnv(t)
		e.newPlayer(t, "ana@example.com", "Ana")
		// The wrong-password counter cannot be written: the answer is 503, never a quiet 401 that skips the count.
		e.exec(t, `CREATE FUNCTION refuse_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'no'; END $$`)
		e.exec(t, `CREATE TRIGGER refuse BEFORE INSERT ON auth_rate_limits FOR EACH ROW WHEN (NEW.scope = 'login') EXECUTE FUNCTION refuse_insert()`)
		w := e.signIn("player", cred("ana@example.com", "nope"))
		if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
	})
}
