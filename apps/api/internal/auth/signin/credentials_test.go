package signin_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

func bodyEquals(t *testing.T, w *httptest.ResponseRecorder, want any) {
	t.Helper()
	var wantNorm any
	raw, _ := json.Marshal(want)
	_ = json.Unmarshal(raw, &wantNorm)
	if got := decode(t, w); !reflect.DeepEqual(got, wantNorm) {
		t.Fatalf("body: got %s, want %s", w.Body.String(), raw)
	}
}

// wantSignedIn checks the cookies and the session row a successful sign-in leaves, and returns the access pass
// claims.
func (e *env) wantSignedIn(t *testing.T, w *httptest.ResponseRecorder, aud store.Audience, accountID uuid.UUID) pass.Claims {
	t.Helper()
	if w.Code != http.StatusOK {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	wantHeaders(t, w)
	access, refresh := cookie(w, session.AccessCookieName(aud)), cookie(w, session.RefreshCookieName(aud))
	if access == nil || refresh == nil {
		t.Fatalf("cookies missing: %v", w.Result().Cookies())
	}
	for _, c := range []*http.Cookie{access, refresh} {
		if c.Domain != "" || !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.Secure { // localhost: not Secure
			t.Errorf("cookie %s attributes: %+v", c.Name, c)
		}
	}
	if access.Path != "/" || refresh.Path != session.RefreshCookiePath {
		t.Errorf("cookie paths: %q %q", access.Path, refresh.Path)
	}
	// B-62 amendment: the access cookie outlives the 15 minute pass so an expired pass still reaches Go.
	if want := int(session.RefreshLifetime(aud) / time.Second); access.MaxAge != want {
		t.Errorf("access Max-Age %d, want %d", access.MaxAge, want)
	}
	if want := int(session.RefreshLifetime(aud) / time.Second); refresh.MaxAge != want {
		t.Errorf("refresh Max-Age %d, want %d", refresh.MaxAge, want)
	}
	claims, err := e.verifier.Verify(access.Value, pass.Audience(aud), e.clk.Now())
	if err != nil || claims.AccountID != accountID.String() {
		t.Fatalf("access pass: %+v %v", claims, err)
	}
	if n := e.sessions(t); n != 1 {
		t.Fatalf("sessions: %d", n)
	}
	if e.events(t, store.EventSignIn) != 1 {
		t.Fatal("no sign_in event")
	}
	return claims
}

func (e *env) wantRefused(t *testing.T, w *httptest.ResponseRecorder, aud store.Audience) {
	t.Helper()
	code, msg := errBody(t, w)
	if w.Code != http.StatusUnauthorized || code != "unauthenticated" || msg != msgBad[aud] {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantHeaders(t, w)
	if len(w.Result().Cookies()) != 0 || e.sessions(t) != 0 {
		t.Fatalf("a refused sign-in must leave no cookie and no session: %v", w.Result().Cookies())
	}
}

var msgBad = map[store.Audience]string{store.AudienceClub: badClub, store.AudiencePlayer: badPlayer, store.AudienceAdmin: badAdmin}

// sign-in.ts:87,94,99: club username (trimmed, lowercased), body { account: { id, name, audience } }.
func TestClubSignIn(t *testing.T) {
	e := newEnv(t)
	a := e.newClub(t, "smash_club", "Smash Club")
	w := e.signIn("club", cred("  Smash_Club  ", goodPass))
	e.wantSignedIn(t, w, store.AudienceClub, a.accountID)
	bodyEquals(t, w, map[string]any{"account": map[string]any{"id": a.accountID, "name": "Smash Club", "audience": "club"}})
	var club uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT club_id FROM auth_sessions`).Scan(&club); err != nil || club != a.accountID {
		t.Fatalf("session club_id: %v %v", club, err)
	}
}

// sign-in.ts:51: { account: { id: player id, name: fullName, audience: 'player' } }; email only (sign-in.ts:87).
func TestPlayerSignIn(t *testing.T) {
	e := newEnv(t)
	a := e.newPlayer(t, "ana@example.com", "Ana Reyes")
	w := e.signIn("player", cred(" Ana@Example.com ", goodPass))
	e.wantSignedIn(t, w, store.AudiencePlayer, a.accountID)
	bodyEquals(t, w, map[string]any{"account": map[string]any{"id": a.accountID, "name": "Ana Reyes", "audience": "player"}})
}

func TestPlayerSignsInByEmailOnly(t *testing.T) {
	e := newEnv(t)
	e.newPlayer(t, "ana@example.com", "Ana Reyes")
	var phone string
	if err := e.pool.QueryRow(e.ctx, `SELECT phone_e164 FROM player_private_contacts`).Scan(&phone); err != nil {
		t.Fatal(err)
	}
	e.wantRefused(t, e.signIn("player", cred(phone, goodPass)), store.AudiencePlayer)
}

// sign-in.ts:43: { kind: 'owner', account: { id: admin id, email } }.
func TestAdminSignIn(t *testing.T) {
	e := newEnv(t)
	a := e.newAdmin(t, "owner@rotra.club")
	w := e.signIn("admin", cred("Owner@Rotra.club", goodPass))
	e.wantSignedIn(t, w, store.AudienceAdmin, a.accountID)
	bodyEquals(t, w, map[string]any{"kind": "owner", "account": map[string]any{"id": a.accountID, "email": "owner@rotra.club"}})
	if got := cookie(w, "rotra-admin-refresh").MaxAge; got != 12*3600 {
		t.Fatalf("admin refresh lasts 12 hours, got %d s", got)
	}
	if got := cookie(w, "rotra-admin-access").MaxAge; got != 12*3600 {
		t.Fatalf("admin access cookie lasts 12 hours (not extended), got %d s", got)
	}
}

// The session carries the trusted client IP (never a header the caller chose).
func TestSignInRecordsClientIP(t *testing.T) {
	e := newEnv(t)
	a := e.newPlayer(t, "ana@example.com", "Ana Reyes")
	w := e.do(req{method: "POST", path: "/api/auth/sign-in", app: "player", body: cred("ana@example.com", goodPass), ip: "203.0.113.9"})
	e.wantSignedIn(t, w, store.AudiencePlayer, a.accountID)
	var ip string
	if err := e.pool.QueryRow(e.ctx, `SELECT host(created_ip) FROM auth_sessions`).Scan(&ip); err != nil || ip != "203.0.113.9" {
		t.Fatalf("created_ip %q %v", ip, err)
	}
}

// Wrong password, unknown login, a login of another app, a locked identity and an account that cannot sign in
// are all the same 401 (sign-in.ts:92,97): nothing reveals which part was wrong.
func TestRefusalsAreIdentical(t *testing.T) {
	cases := []struct {
		name  string
		aud   store.Audience
		setup func(t *testing.T, e *env)
		login string
		pw    string
	}{
		{"club wrong password", store.AudienceClub, func(t *testing.T, e *env) { e.newClub(t, "smash", "Smash") }, "smash", "nope"},
		{"club unknown login", store.AudienceClub, func(t *testing.T, e *env) {}, "ghost", goodPass},
		{"club login is the invalid address", store.AudienceClub, func(t *testing.T, e *env) { e.newClub(t, "smash", "Smash") }, "smash@clubs.rotra.invalid", goodPass},
		{"club identity disabled", store.AudienceClub, func(t *testing.T, e *env) {
			a := e.newClub(t, "smash", "Smash")
			e.exec(t, `UPDATE auth_identities SET disabled_at = $2 WHERE id = $1`, a.ident.ID, base)
		}, "smash", goodPass},
		{"club not provisioned", store.AudienceClub, func(t *testing.T, e *env) {
			e.newClub(t, "smash", "Smash")
			e.exec(t, `UPDATE club_accounts SET provisioned_at = NULL`)
		}, "smash", goodPass},
		{"club disabled", store.AudienceClub, func(t *testing.T, e *env) {
			e.newClub(t, "smash", "Smash")
			e.exec(t, `UPDATE club_accounts SET disabled_at = now()`)
		}, "smash", goodPass},
		{"club identity without an account", store.AudienceClub, func(t *testing.T, e *env) {
			e.identity(t, store.AudienceClub, "orphan", e.argonHash(t, goodPass), store.SchemeArgon2id)
		}, "orphan", goodPass},
		{"club username on the player app", store.AudiencePlayer, func(t *testing.T, e *env) { e.newClub(t, "smash", "Smash") }, "smash", goodPass},
		{"player wrong password", store.AudiencePlayer, func(t *testing.T, e *env) { e.newPlayer(t, "ana@example.com", "Ana") }, "ana@example.com", "nope"},
		{"player disabled", store.AudiencePlayer, func(t *testing.T, e *env) {
			e.newPlayer(t, "ana@example.com", "Ana")
			e.exec(t, `UPDATE player_accounts SET disabled_at = now()`)
		}, "ana@example.com", goodPass},
		{"player unknown", store.AudiencePlayer, func(t *testing.T, e *env) {}, "ghost@example.com", goodPass},
		{"admin wrong password", store.AudienceAdmin, func(t *testing.T, e *env) { e.newAdmin(t, "owner@rotra.club") }, "owner@rotra.club", "nope"},
		{"admin unknown", store.AudienceAdmin, func(t *testing.T, e *env) {}, "ghost@rotra.club", goodPass},
		{"admin identity disabled", store.AudienceAdmin, func(t *testing.T, e *env) {
			a := e.newAdmin(t, "owner@rotra.club")
			e.exec(t, `UPDATE auth_identities SET disabled_at = $2 WHERE id = $1`, a.ident.ID, base)
		}, "owner@rotra.club", goodPass},
		{"identifier with a NUL", store.AudiencePlayer, func(t *testing.T, e *env) {}, "ana\x00@example.com", goodPass},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			e := newEnv(t)
			c.setup(t, e)
			e.wantRefused(t, e.signIn(string(c.aud), cred(c.login, c.pw)), c.aud)
		})
	}
}

// A hash that cannot be read (corrupt row) is a refusal too, not a 503 that would tell the login exists.
func TestCorruptStoredHashIsRefused(t *testing.T) {
	e := newEnv(t)
	a := e.newPlayer(t, "ana@example.com", "Ana")
	e.exec(t, `UPDATE auth_identities SET password_hash = 'garbage' WHERE id = $1`, a.ident.ID)
	e.wantRefused(t, e.signIn("player", cred("ana@example.com", goodPass)), store.AudiencePlayer)
}

// Admin: the right password for an identity whose admin account is missing or inactive is a 200 `denied` and
// no session (the TypeScript leaves a session open, sign-in.ts:41-42,99; Go does not). A wrong password stays 401.
func TestAdminDeniedIssuesNoSession(t *testing.T) {
	for name, setup := range map[string]func(t *testing.T, e *env){
		"inactive": func(t *testing.T, e *env) {
			e.newAdmin(t, "owner@rotra.club")
			e.exec(t, `UPDATE admin_accounts SET active = false`)
		},
		"no admin row": func(t *testing.T, e *env) {
			e.identity(t, store.AudienceAdmin, "owner@rotra.club", e.argonHash(t, goodPass), store.SchemeArgon2id)
		},
	} {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			setup(t, e)
			w := e.signIn("admin", cred("Owner@rotra.club", goodPass))
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantHeaders(t, w)
			bodyEquals(t, w, map[string]any{"kind": "denied", "accountDescription": "owner@rotra.club"})
			if len(w.Result().Cookies()) != 0 || e.sessions(t) != 0 || e.events(t, store.EventSignIn) != 0 {
				t.Fatalf("denied must issue nothing: %v", w.Result().Cookies())
			}
			e.wantRefused(t, e.signIn("admin", cred("owner@rotra.club", "nope")), store.AudienceAdmin)
		})
	}
}

// Database or internal failure is a 503 (sign-in.ts:90-91).
func TestSignInUnavailable(t *testing.T) {
	t.Run("database down", func(t *testing.T) {
		e := newEnv(t)
		e.newPlayer(t, "ana@example.com", "Ana")
		e.pool.Close()
		w := e.signIn("player", cred("ana@example.com", goodPass))
		if code, msg := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" || msg != unavailable {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		wantHeaders(t, w)
	})
	t.Run("display name lookup fails: no session is left behind", func(t *testing.T) {
		e := newEnv(t)
		e.newClub(t, "smash", "Smash")
		e.exec(t, `ALTER TABLE clubs RENAME TO clubs_gone`)
		w := e.signIn("club", cred("smash", goodPass))
		if code, _ := errBody(t, w); w.Code != http.StatusServiceUnavailable || code != "unavailable" {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		if e.sessions(t) != 0 || len(w.Result().Cookies()) != 0 {
			t.Fatal("an orphan session was left behind")
		}
	})
}

// NEW (R4): 429 with Retry-After and the rate_limited envelope; the account lock counts wrong passwords and
// unknown logins alike and does not reveal which.
func TestSignInRateLimits(t *testing.T) {
	tune := func(f func(*config.AuthLimits)) func(*config.AuthTuning) {
		return func(c *config.AuthTuning) { f(&c.Limits) }
	}
	wantLimited := func(t *testing.T, w *httptest.ResponseRecorder) {
		t.Helper()
		code, _ := errBody(t, w)
		if w.Code != http.StatusTooManyRequests || code != "rate_limited" {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		if w.Header().Get("Retry-After") == "" || len(w.Result().Cookies()) != 0 {
			t.Fatalf("Retry-After %q cookies %v", w.Header().Get("Retry-After"), w.Result().Cookies())
		}
		wantHeaders(t, w)
	}
	t.Run("wrong passwords lock the account, even for the right password", func(t *testing.T) {
		e := newEnv(t, tune(func(l *config.AuthLimits) { l.LoginFailures = config.AuthLimit{Max: 2, Window: 15 * time.Minute} }))
		e.newPlayer(t, "ana@example.com", "Ana")
		for range 2 {
			e.wantRefused(t, e.signIn("player", cred("ana@example.com", "nope")), store.AudiencePlayer)
		}
		wantLimited(t, e.signIn("player", cred("ana@example.com", goodPass)))
		if e.sessions(t) != 0 {
			t.Fatal("a locked account must not sign in")
		}
		e.clk.Advance(16 * time.Minute)
		e.signIn("player", cred("ana@example.com", goodPass)) // the window ended: signs in again
		if e.sessions(t) != 1 {
			t.Fatal("the lock must end with its window")
		}
	})
	t.Run("unknown logins count too", func(t *testing.T) {
		e := newEnv(t, tune(func(l *config.AuthLimits) { l.LoginFailures = config.AuthLimit{Max: 2, Window: 15 * time.Minute} }))
		for range 2 {
			e.wantRefused(t, e.signIn("player", cred("ghost@example.com", goodPass)), store.AudiencePlayer)
		}
		wantLimited(t, e.signIn("player", cred("ghost@example.com", goodPass)))
	})
	t.Run("successful sign-ins are not wrong passwords", func(t *testing.T) {
		e := newEnv(t, tune(func(l *config.AuthLimits) { l.LoginFailures = config.AuthLimit{Max: 2, Window: 15 * time.Minute} }))
		e.newPlayer(t, "ana@example.com", "Ana")
		for range 4 {
			if w := e.signIn("player", cred("ana@example.com", goodPass)); w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
		}
	})
	t.Run("per IP, and a different IP is unaffected", func(t *testing.T) {
		e := newEnv(t, tune(func(l *config.AuthLimits) { l.IPAttempts = config.AuthLimit{Max: 2, Window: 15 * time.Minute} }))
		e.newPlayer(t, "ana@example.com", "Ana")
		at := func(ip string) *httptest.ResponseRecorder {
			return e.do(req{method: "POST", path: "/api/auth/sign-in", app: "player", body: cred("ana@example.com", goodPass), ip: ip})
		}
		at("198.51.100.1")
		at("198.51.100.1")
		wantLimited(t, at("198.51.100.1"))
		if w := at("198.51.100.2"); w.Code != http.StatusOK {
			t.Fatalf("other IP: %d %s", w.Code, w.Body.String())
		}
	})
	t.Run("per device", func(t *testing.T) {
		e := newEnv(t, tune(func(l *config.AuthLimits) { l.DeviceAttempts = config.AuthLimit{Max: 1, Window: 15 * time.Minute} }))
		e.newClub(t, "smash", "Smash")
		dev := uuid.New().String()
		body := `{"identifier":"smash","password":"nope","deviceId":"` + dev + `"}`
		e.signIn("club", body)
		wantLimited(t, e.signIn("club", body))
	})
}

// sign-in.ts has no rehash (the provider did it); here an imported bcrypt hash moves to argon2id on first
// sign-in, and a failed rehash never fails the sign-in.
func TestRehashOnSignIn(t *testing.T) {
	t.Run("bcrypt to argon2id", func(t *testing.T) {
		e := newEnv(t)
		a := e.newPlayer(t, "ana@example.com", "Ana")
		e.exec(t, `UPDATE auth_identities SET password_hash = $2, password_scheme = 'bcrypt' WHERE id = $1`, a.ident.ID, bcryptHash(t, goodPass, 4))
		if w := e.signIn("player", cred("ana@example.com", goodPass)); w.Code != http.StatusOK {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		var hash, scheme string
		if err := e.pool.QueryRow(e.ctx, `SELECT password_hash, password_scheme FROM auth_identities WHERE id = $1`, a.ident.ID).Scan(&hash, &scheme); err != nil {
			t.Fatal(err)
		}
		if scheme != store.SchemeArgon2id || !strings.HasPrefix(hash, "$argon2id$") {
			t.Fatalf("not rehashed: %s %.12s", scheme, hash)
		}
		if w := e.signIn("player", cred("ana@example.com", goodPass)); w.Code != http.StatusOK {
			t.Fatalf("second sign-in: %d", w.Code)
		}
	})
	t.Run("a wrong bcrypt password is not rehashed", func(t *testing.T) {
		e := newEnv(t)
		a := e.newPlayer(t, "ana@example.com", "Ana")
		hash := bcryptHash(t, goodPass, 4)
		e.exec(t, `UPDATE auth_identities SET password_hash = $2, password_scheme = 'bcrypt' WHERE id = $1`, a.ident.ID, hash)
		e.signIn("player", cred("ana@example.com", "nope"))
		var got string
		_ = e.pool.QueryRow(e.ctx, `SELECT password_hash FROM auth_identities WHERE id = $1`, a.ident.ID).Scan(&got)
		if got != hash {
			t.Fatal("hash changed on a wrong password")
		}
	})
	t.Run("a failing rehash is logged and the sign-in still succeeds", func(t *testing.T) {
		e := newEnv(t)
		a := e.newPlayer(t, "ana@example.com", "Ana")
		e.exec(t, `UPDATE auth_identities SET password_hash = $2, password_scheme = 'bcrypt' WHERE id = $1`, a.ident.ID, bcryptHash(t, goodPass, 4))
		e.exec(t, `CREATE FUNCTION refuse_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'no'; END $$`)
		e.exec(t, `CREATE TRIGGER refuse BEFORE UPDATE ON auth_identities FOR EACH ROW EXECUTE FUNCTION refuse_update()`)
		if w := e.signIn("player", cred("ana@example.com", goodPass)); w.Code != http.StatusOK {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
	})
}

// Queue sign-in enrolls the device (deviceId, deviceLabel; R3, B-28). Only club sign-in does.
func TestClubDeviceEnrollment(t *testing.T) {
	signInWith := func(e *env, extra string) *httptest.ResponseRecorder {
		return e.signIn("club", `{"identifier":"smash","password":"`+goodPass+`"`+extra+`}`)
	}
	t.Run("enrolls", func(t *testing.T) {
		e := newEnv(t)
		a := e.newClub(t, "smash", "Smash")
		dev := uuid.New()
		w := signInWith(e, `,"deviceId":"`+dev.String()+`","deviceLabel":"  Chrome on Android "`)
		e.wantSignedIn(t, w, store.AudienceClub, a.accountID)
		var label string
		var club uuid.UUID
		if err := e.pool.QueryRow(e.ctx, `SELECT label, club_id FROM devices WHERE id = $1`, dev).Scan(&label, &club); err != nil || label != "Chrome on Android" || club != a.accountID {
			t.Fatalf("device row: %q %v %v", label, club, err)
		}
		var sessDev uuid.UUID
		if err := e.pool.QueryRow(e.ctx, `SELECT device_id FROM auth_sessions`).Scan(&sessDev); err != nil || sessDev != dev {
			t.Fatalf("session device: %v %v", sessDev, err)
		}
		if e.events(t, store.EventDeviceEnrolled) != 1 {
			t.Fatal("no device_enrolled event")
		}
	})
	t.Run("bad deviceId is ignored", func(t *testing.T) {
		for name, extra := range map[string]string{
			"text": `,"deviceId":"nope"`, "number": `,"deviceId":7`, "nil uuid": `,"deviceId":"00000000-0000-0000-0000-000000000000"`,
			"braces": `,"deviceId":"{` + uuid.New().String() + `}"`, "null": `,"deviceId":null`,
		} {
			e := newEnv(t)
			a := e.newClub(t, "smash", "Smash")
			e.wantSignedIn(t, signInWith(e, extra), store.AudienceClub, a.accountID)
			if e.count(t, `SELECT count(*) FROM devices`) != 0 {
				t.Errorf("%s: a device was enrolled", name)
			}
		}
	})
	t.Run("labels are cleaned", func(t *testing.T) {
		e := newEnv(t)
		a := e.newClub(t, "smash", "Smash")
		long := strings.Repeat("é", 150)
		dev := uuid.New()
		e.wantSignedIn(t, signInWith(e, `,"deviceId":"`+dev.String()+`","deviceLabel":"`+long+`\u0000x"`), store.AudienceClub, a.accountID)
		var label string
		_ = e.pool.QueryRow(e.ctx, `SELECT label FROM devices`).Scan(&label)
		if len([]rune(label)) != 100 || strings.ContainsRune(label, 0) {
			t.Fatalf("label has %d runes", len([]rune(label)))
		}
	})
	t.Run("another club's device is a 404 and a revoked one a 403, with nothing left behind", func(t *testing.T) {
		e := newEnv(t)
		e.newClub(t, "smash", "Smash")
		other := e.newClub(t, "other", "Other")
		dev, gone := uuid.New(), uuid.New()
		now := e.clk.Now()
		e.exec(t, `INSERT INTO devices (id, club_id, label, registered_at, updated_at) VALUES ($1, $2, 'x', $3, $3)`, dev, other.accountID, now)
		e.exec(t, `INSERT INTO devices (id, club_id, label, registered_at, revoked_at, revoke_reason, updated_at)
		  SELECT $1, club_id, 'y', $2, $2, 'removed', $2 FROM club_accounts WHERE username = 'smash'`, gone, now)
		w := signInWith(e, `,"deviceId":"`+dev.String()+`"`)
		if code, _ := errBody(t, w); w.Code != http.StatusNotFound || code != "not_found" {
			t.Fatalf("other club: %d %s", w.Code, w.Body.String())
		}
		w = signInWith(e, `,"deviceId":"`+gone.String()+`"`)
		if code, _ := errBody(t, w); w.Code != http.StatusForbidden || code != "forbidden" {
			t.Fatalf("revoked: %d %s", w.Code, w.Body.String())
		}
		if e.sessions(t) != 0 || len(w.Result().Cookies()) != 0 {
			t.Fatal("a refused device left a session")
		}
	})
	t.Run("player and admin sign-ins ignore a device", func(t *testing.T) {
		e := newEnv(t)
		a := e.newPlayer(t, "ana@example.com", "Ana")
		w := e.signIn("player", `{"identifier":"ana@example.com","password":"`+goodPass+`","deviceId":"`+uuid.New().String()+`"}`)
		e.wantSignedIn(t, w, store.AudiencePlayer, a.accountID)
		if e.count(t, `SELECT count(*) FROM devices`) != 0 {
			t.Fatal("a player sign-in enrolled a device")
		}
	})
}
