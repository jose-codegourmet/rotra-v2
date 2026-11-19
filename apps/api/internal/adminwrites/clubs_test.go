package adminwrites_test

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The club login, which the golden file cannot pin (the capture has no Supabase): the sign-in identity the club gets, the
// account that points at it, and the club signing in through the same path the sign-in handler takes.

func addClubBody(command, username, password string) string {
	return fmt.Sprintf(`{"sourceCommandId":%q,"name":"Banilad Birdies","cityCode":"PH-CEB","foundingAddress":"Hall 9","username":%q,"password":%q,"price":{"pricing":"paid","monthly":180000,"yearly":1800000}}`,
		command, username, password)
}

func postClub(t *testing.T, e *writetest.Env, body string) (int, string) {
	t.Helper()
	w := e.Do(writetest.Request{Method: "POST", Path: "/api/clubs", App: "admin", Bearer: e.AdminPass(t, owner), Body: body})
	return w.Code, w.Body.String()
}

// A created club has an identity (audience club, the username as the login key, argon2id, the password it was given),
// its account is provisioned with that identity as its subject, and the club signs in: the lookup sign-in makes by login
// key finds the identity, the shared hasher accepts the password and refuses another, the account behind it is the club,
// and the pass issued for it reads the club's own page. The Admin list shows the account ready.
func TestACreatedClubSignsIn(t *testing.T) {
	e, _ := clubsEnv(t)
	code, body := postClub(t, e, addClubBody("c2000000-0000-4000-8000-000000000401", "  Banilad.BIRDIES ", "correct horse battery"))
	if code != 201 {
		t.Fatalf("create: %d %s", code, body)
	}
	var made struct{ ClubID, Name string }
	if err := json.Unmarshal([]byte(strings.ReplaceAll(strings.ReplaceAll(body, `"clubId"`, `"ClubID"`), `"name"`, `"Name"`)), &made); err != nil {
		t.Fatal(err)
	}
	clubID := uuid.MustParse(made.ClubID)

	var provider string
	var subject uuid.UUID
	var provisioned bool
	if err := e.Pool.QueryRow(e.Ctx, `SELECT auth_provider, auth_subject, provisioned_at IS NOT NULL FROM club_accounts WHERE club_id = $1`, clubID).Scan(&provider, &subject, &provisioned); err != nil {
		t.Fatal(err)
	}
	if provider != "rotra" || !provisioned {
		t.Errorf("account: provider %q provisioned %v", provider, provisioned)
	}
	ident, err := e.Store.GetIdentityByLogin(e.Ctx, store.AudienceClub, "banilad.birdies")
	if err != nil {
		t.Fatalf("identity: %v", err)
	}
	if ident.ID != subject || ident.PasswordScheme != store.SchemeArgon2id || ident.DisabledAt != nil || !strings.HasPrefix(ident.PasswordHash, "$argon2id$") {
		t.Errorf("identity: %+v", ident)
	}
	if !ident.PasswordChangedAt.Equal(e.Clock.Now()) || !ident.CreatedAt.Equal(e.Clock.Now()) {
		t.Errorf("times: %v %v, clock %v", ident.PasswordChangedAt, ident.CreatedAt, e.Clock.Now())
	}
	if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE audience = 'club'`); n != 1 {
		t.Errorf("%d club identities", n)
	}
	if strings.Contains(ident.PasswordHash, "correct horse") {
		t.Error("the password is stored in clear")
	}
	hasher := testHasher()
	if ok, _, err := hasher.Verify(e.Ctx, "correct horse battery", ident.PasswordHash); err != nil || !ok {
		t.Errorf("the password must verify: %v %v", ok, err)
	}
	if ok, _, _ := hasher.Verify(e.Ctx, "wrong horse battery", ident.PasswordHash); ok {
		t.Error("another password must not verify")
	}
	// The rest of sign-in: the account behind the identity is the club, and its pass is accepted.
	acct, err := e.Store.ClubAccountBySubject(e.Ctx, ident.ID)
	if err != nil || acct.ClubID != clubID || acct.DisabledAt != nil || acct.ProvisionedAt == nil {
		t.Fatalf("account by subject: %+v %v", acct, err)
	}
	iss, err := e.Service.Issue(e.Ctx, session.IssueInput{Identity: ident, AccountID: acct.ClubID, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	read := e.Do(writetest.Request{Method: "GET", Path: "/api/club", App: "club", Bearer: iss.AccessPass})
	if read.Code != 200 || !strings.Contains(read.Body.String(), `"name":"Banilad Birdies"`) {
		t.Errorf("the club reads its own page: %d %s", read.Code, read.Body.String())
	}
	list := e.Do(writetest.Request{Method: "GET", Path: "/api/clubs/" + made.ClubID, App: "admin", Bearer: e.AdminPass(t, owner)})
	if list.Code != 200 || !strings.Contains(list.Body.String(), `"accountState":"ready"`) || !strings.Contains(list.Body.String(), `"username":"banilad.birdies"`) {
		t.Errorf("the Admin sees the account ready: %d %s", list.Code, list.Body.String())
	}
}

// The login key is the username as sign-in will look it up: trimmed and lower-cased the way signin/credentials.go does it
// to what the club types, which for the username shown to the club (already lower case) is itself.
func TestTheLoginKeyIsWhatSignInLooksUp(t *testing.T) {
	for i, c := range []struct{ typed, shown string }{
		{"Banilad.Birdies", "banilad.birdies"}, {"ÑANDÚ", "ñandú"}, {"  X.Y  ", "x.y"}, {"ban ilad", "ban ilad"}, {"B@n!lad+/x", "b@n!lad+/x"},
	} {
		e, _ := clubsEnv(t)
		if code, body := postClub(t, e, addClubBody(fmt.Sprintf("c2000000-0000-4000-8000-0000000004%02d", 10+i), c.typed, "password one")); code != 201 {
			t.Fatalf("%q: %d %s", c.typed, code, body)
		}
		var key string
		if err := e.Pool.QueryRow(e.Ctx, `SELECT login_key FROM auth_identities WHERE audience = 'club'`).Scan(&key); err != nil {
			t.Fatal(err)
		}
		if key != c.shown {
			t.Errorf("%q: login key %q, want %q", c.typed, key, c.shown)
		}
		// What a club types when it copies the shown username finds its identity.
		if _, err := e.Store.GetIdentityByLogin(e.Ctx, store.AudienceClub, strings.ToLower(strings.TrimSpace(c.shown))); err != nil {
			t.Errorf("%q: sign-in lookup of the shown username: %v", c.shown, err)
		}
	}
}

// A retried command makes one sign-in. And a club the TypeScript staged but never gave its login (its provider failed) is
// resumed: the retry makes the identity now, counts the account once, and records one more event.
func TestRetryAndResume(t *testing.T) {
	e, _ := clubsEnv(t)
	const staged = "c3000000-0000-4000-8000-0000000000c4" // Fresh Start: a club and an account with no sign-in, in the seed
	for i := 0; i < 2; i++ {
		if code, body := postClub(t, e, addClubBody(staged, "ignored", "first password")); code != 201 || !strings.Contains(body, `"name":"Fresh Start"`) {
			t.Fatalf("round %d: %d %s", i, code, body)
		}
	}
	if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE audience = 'club'`); n != 1 {
		t.Errorf("%d identities after a resume and a retry", n)
	}
	if n := count(t, e, `SELECT count(*) FROM club_accounts WHERE username = 'freshstart' AND revision = 2 AND auth_subject IS NOT NULL`); n != 1 {
		t.Errorf("the staged account is provisioned once")
	}
	if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE audience = 'club' AND login_key = 'freshstart'`); n != 1 {
		t.Errorf("the identity has the account's own username as its key, not the one in the retry")
	}
	if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'club.account_provisioned'`); n != 1 {
		t.Errorf("%d provisioned events", n)
	}
	var hash string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT password_hash FROM auth_identities WHERE login_key = 'freshstart'`).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if ok, _, _ := testHasher().Verify(e.Ctx, "first password", hash); !ok {
		t.Error("the retry's password is the first one's: the first call made the sign-in")
	}
}

// A sign-in that already has the username (one the import made, for instance) refuses the new club as a taken name, and
// nothing is left behind.
func TestAnIdentityWithTheUsernameRefusesTheClub(t *testing.T) {
	e, _ := clubsEnv(t)
	e.Exec(t, `INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at) VALUES ('f0000000-0000-4000-8000-000000000001', 'club', 'banilad.birdies', 'x', 'argon2id', now())`)
	code, body := postClub(t, e, addClubBody("c2000000-0000-4000-8000-000000000430", "banilad.birdies", "password one"))
	if code != 409 || !strings.Contains(body, "A club with this name or username already exists.") {
		t.Fatalf("%d %s", code, body)
	}
	for _, sql := range []string{`SELECT count(*) FROM clubs WHERE name = 'Banilad Birdies'`, `SELECT count(*) FROM club_accounts WHERE username = 'banilad.birdies'`, `SELECT count(*) FROM admin_audit_events WHERE action LIKE 'club.%' AND occurred_at > '2026-11-10'`} {
		if n := count(t, e, sql); n != 0 {
			t.Errorf("%s: %d rows left behind", sql, n)
		}
	}
}

// The hash limit of the shared password rules (the TypeScript has none): 1025 characters are refused with the message of
// the other places that set a password, nothing is hashed or written, and 1024 are accepted (the golden file).
func TestAPasswordPastTheHashLimitIsRefused(t *testing.T) {
	e, _ := clubsEnv(t)
	code, body := postClub(t, e, addClubBody("c2000000-0000-4000-8000-000000000440", "banilad.birdies", strings.Repeat("p", 1025)))
	if code != 422 || !strings.Contains(body, `"password":"Use 1024 characters or fewer."`) {
		t.Fatalf("%d %s", code, body)
	}
	if n := count(t, e, `SELECT count(*) FROM clubs WHERE name = 'Banilad Birdies'`); n != 0 {
		t.Errorf("%d clubs written", n)
	}
	// A password counted in characters, not units: 600 astral characters are 1200 units and 600 characters.
	if code, body := postClub(t, e, addClubBody("c2000000-0000-4000-8000-000000000441", "banilad.birdies", strings.Repeat("\U0001F3F8", 600))); code != 201 {
		t.Fatalf("%d %s", code, body)
	}
}

// The invite code: ten characters of the alphabet with no look-alikes, and different every time.
func TestInviteCodes(t *testing.T) {
	e, _ := clubsEnv(t)
	seen := map[string]bool{}
	re := regexp.MustCompile(`^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$`)
	for i := 0; i < 6; i++ {
		if code, body := postClub(t, e, strings.Replace(addClubBody(fmt.Sprintf("c2000000-0000-4000-8000-0000000004%02d", 50+i), fmt.Sprintf("invite.%d", i), "password one"), "Banilad Birdies", fmt.Sprintf("Birdies %d", i), 1)); code != 201 {
			t.Fatalf("%d %s", code, body)
		}
	}
	rows, err := e.Pool.Query(e.Ctx, `SELECT invite_code FROM clubs WHERE name LIKE 'Birdies %'`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			t.Fatal(err)
		}
		if !re.MatchString(c) || seen[c] {
			t.Errorf("invite code %q", c)
		}
		seen[c] = true
	}
}
