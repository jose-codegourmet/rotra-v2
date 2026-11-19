package register_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/register"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// These tests pin what the golden cannot: the TypeScript had no Supabase to capture the sign-in, the session cookies and the
// login itself (the Go side makes the identity, hashes the password and issues the session), and a race or a seam is not
// something a capture can repeat. Each says which TypeScript line it follows or which deviation (plan.md, Deviations log) it pins.

var (
	now      = time.Date(2026, 11, 20, 4, 0, 0, 0, time.UTC)
	birdie   = "c9000000-0000-4000-8000-000000000002"
	smash    = "c9000000-0000-4000-8000-000000000001"
	attempt1 = strings.Repeat("a", 64)
	attempt2 = strings.Repeat("b", 64)
)

func newEnv(t *testing.T, scenario ...string) *writetest.Env {
	t.Helper()
	e := writetest.NewEnvFull(t, now, build)
	e.Players = true
	e.Reseed(t, writetest.ReadSeed(t, testdata, "player.seed.sql"), scenario)
	return e
}

type values map[string]any

func form(over values) values {
	v := values{"fullName": "Newbie Tan", "nickname": "Newb", "playingStyle": "Net player", "experienceYears": "3", "experienceMonths": "4",
		"facebook": "https://facebook.com/newbie", "instagram": "", "youtube": "", "linkedin": "",
		"email": "newbie@example.test", "phone": "0917 555 0301", "password": "correct horse"}
	for k, x := range over {
		v[k] = x
	}
	return v
}

func request(attempt string, club string, over values) writetest.Request {
	body, _ := json.Marshal(map[string]any{"attempt": attempt, "values": form(over)})
	return writetest.Request{Method: "POST", Path: "/api/register/" + club + "?k=" + map[string]string{birdie: "BIRDIE2026", smash: "SMASHSS123"}[club], App: "player", Body: string(body)}
}

func decode(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("body %q: %v", w.Body.String(), err)
	}
	return m
}

func count(t *testing.T, e *writetest.Env, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := e.Pool.QueryRow(e.Ctx, sql, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func cookie(w *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

// A registration makes the login (registerFromClaim's createLogin, replaced by one identity), maps the account to it, signs
// the player in and answers with the session's cookies.
func TestRegistrationMakesTheLoginAndSignsTheNewPlayerIn(t *testing.T) {
	e := newEnv(t)
	w := e.Do(request(attempt1, birdie, nil))
	if w.Code != 200 || decode(t, w)["status"] != "registered" {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	var id, scheme, hash, login string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT id::text, password_scheme, password_hash, login_key FROM auth_identities WHERE audience = 'player' AND login_key = 'newbie@example.test'`).Scan(&id, &scheme, &hash, &login); err != nil {
		t.Fatal(err)
	}
	if scheme != store.SchemeArgon2id || !strings.HasPrefix(hash, "$argon2id$") {
		t.Fatalf("scheme %q hash %q", scheme, hash)
	}
	if ok, _, err := e.Service.Hasher().Verify(e.Ctx, "correct horse", hash); err != nil || !ok {
		t.Fatalf("the stored hash does not verify the password: %v %v", ok, err)
	}
	if n := count(t, e, `SELECT count(*) FROM player_accounts WHERE auth_provider = 'rotra' AND auth_subject = $1::uuid`, id); n != 1 {
		t.Fatalf("%d accounts map to the identity", n)
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE audience = 'player' AND identity_id = $1::uuid`, id); n != 1 {
		t.Fatalf("%d sessions", n)
	}
	for _, name := range []string{"rotra-player-access", "rotra-player-refresh"} {
		c := cookie(w, name)
		if c == nil || c.Value == "" || !c.HttpOnly || c.MaxAge <= 0 {
			t.Fatalf("cookie %s: %+v", name, c)
		}
	}
	if got := w.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Fatalf("cache-control %q", got)
	}
}

// A match answers no cookie and makes no session.
func TestAMatchSignsNobodyIn(t *testing.T) {
	e := newEnv(t)
	w := e.Do(request(attempt1, birdie, values{"phone": "0917 555 0002"}))
	if w.Code != 200 || decode(t, w)["status"] != "account-match" || len(w.Result().Cookies()) != 0 {
		t.Fatalf("%d %s %v", w.Code, w.Body, w.Result().Cookies())
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE audience = 'player'`); n != 0 {
		t.Fatalf("%d sessions", n)
	}
}

// The retry of a lost answer (the same attempt, details and password) signs in again and makes no second login; a wrong
// password is the credentials refusal (registerFromClaim: signInWithPassword fails, CREDENTIALS) with no cookie.
func TestRetryOfAnAttemptSignsInAgainWithTheRightPasswordOnly(t *testing.T) {
	e := newEnv(t)
	if w := e.Do(request(attempt1, birdie, nil)); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	again := e.Do(request(attempt1, birdie, nil))
	if again.Code != 200 || cookie(again, "rotra-player-access") == nil {
		t.Fatalf("%d %s", again.Code, again.Body)
	}
	if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE login_key = 'newbie@example.test'`); n != 1 {
		t.Fatalf("%d logins", n)
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE audience = 'player'`); n != 2 {
		t.Fatalf("%d sessions", n)
	}
	wrong := e.Do(request(attempt1, birdie, values{"password": "wrong horse", "fullName": "Changed"}))
	if wrong.Code != 422 || len(wrong.Result().Cookies()) != 0 || !strings.Contains(wrong.Body.String(), `"email"`) {
		t.Fatalf("%d %s", wrong.Code, wrong.Body)
	}
	if n := count(t, e, `SELECT count(*) FROM players WHERE full_name = 'Changed'`); n != 0 {
		t.Fatal("a refused retry saved its details")
	}
}

// deviation: a password the provider would refuse (under 6 characters: weak_password, a 503 after the staging committed) is a
// 422 on `password` before anything is staged; the policy is the shared password.Validate.
func TestAWeakPasswordIsRefusedBeforeAnythingIsStaged(t *testing.T) {
	e := newEnv(t)
	for name, pw := range map[string]string{"short": "abc", "long": strings.Repeat("p", 1025)} {
		w := e.Do(request(attempt1, birdie, values{"password": pw}))
		if w.Code != 422 || !strings.Contains(w.Body.String(), `"password"`) {
			t.Fatalf("%s: %d %s", name, w.Code, w.Body)
		}
	}
	for _, table := range []string{"player_claim_links", "auth_identities WHERE login_key = 'newbie@example.test'"} {
		if n := count(t, e, "SELECT count(*) FROM "+table); n != 0 {
			t.Fatalf("%s holds %d rows", table, n)
		}
	}
	if n := count(t, e, `SELECT count(*) FROM player_private_contacts WHERE phone_e164 = '+639175550301'`); n != 0 {
		t.Fatal("a refused registration staged a contact")
	}
}

// deviation: what zod lets through and the table cannot hold (an http link: the CHECK wants https; a NUL character in text)
// was a 500 after the account was made (saveDetails, account-access.ts); here it is a 422 on the field before anything is staged.
func TestDetailsTheTableCannotHoldAreRefusedBeforeStaging(t *testing.T) {
	e := newEnv(t)
	for name, c := range map[string]struct {
		over  values
		field string
	}{
		"http link": {values{"facebook": "http://facebook.com/newbie"}, "facebook"},
		"nul name":  {values{"fullName": "New\u0000bie"}, "fullName"},
		"nul style": {values{"playingStyle": "a\u0000b"}, "playingStyle"},
		"nul nick":  {values{"nickname": "N\u0000"}, "nickname"},
	} {
		w := e.Do(request(attempt1, birdie, c.over))
		if w.Code != 422 || !strings.Contains(w.Body.String(), `"`+c.field+`"`) {
			t.Fatalf("%s: %d %s", name, w.Code, w.Body)
		}
	}
	if n := count(t, e, `SELECT count(*) FROM player_claim_links`); n != 0 {
		t.Fatal("a refused registration staged a link")
	}
}

// The provider could refuse an email another login won after the preflight (createLogin: provider_conflict, never used): the
// answer is the match (finishRegistration, `conflict` with fields.email). The staging stays, as it does in the TypeScript, and
// no account or session is made.
func TestALoginThatWinsTheEmailAfterTheCheckIsAMatch(t *testing.T) {
	e := newEnv(t)
	defer register.SetAfterStage(func() {
		e.Exec(t, `INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision)
			VALUES ('f5000000-0000-4000-8000-0000000000ff', 'player', 'newbie@example.test', 'x', 'argon2id', now(), now(), now(), 1)`)
	})()
	w := e.Do(request(attempt1, birdie, nil))
	if w.Code != 200 || decode(t, w)["status"] != "account-match" || len(w.Result().Cookies()) != 0 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if n := count(t, e, `SELECT count(*) FROM player_accounts a JOIN player_private_contacts c ON c.player_id = a.player_id WHERE c.phone_e164 = '+639175550301'`); n != 0 {
		t.Fatal("an account was made")
	}
	if n := count(t, e, `SELECT count(*) FROM player_claim_links`); n != 1 {
		t.Fatalf("%d staging links", n)
	}
}

// Two taps of one attempt (stageRegistration's lock on the token, then two claims of one link): one player, one login, one
// account, whatever the answers. The TypeScript could answer the second tap 409 (its saveDetails read the revision before the
// other tap's save); either answer is allowed, and one is a success.
func TestTwoTapsOfOneAttemptMakeOneAccount(t *testing.T) {
	e := newEnv(t)
	for i := 0; i < 6; i++ {
		e.Reseed(t, writetest.ReadSeed(t, testdata, "player.seed.sql"), nil)
		out := e.DoAll([]writetest.Request{request(attempt1, birdie, nil), request(attempt1, birdie, nil)})
		ok := 0
		for _, w := range out {
			switch w.Code {
			case 200:
				if decode(t, w)["status"] != "registered" {
					t.Fatalf("round %d: %s", i, w.Body)
				}
				ok++
			case 409:
			default:
				t.Fatalf("round %d: %d %s", i, w.Code, w.Body)
			}
		}
		if ok == 0 {
			t.Fatalf("round %d: neither tap registered", i)
		}
		for _, q := range []string{
			`SELECT count(*) FROM player_private_contacts WHERE phone_e164 = '+639175550301'`,
			`SELECT count(*) FROM auth_identities WHERE login_key = 'newbie@example.test'`,
			`SELECT count(*) FROM player_accounts a JOIN player_private_contacts c ON c.player_id = a.player_id WHERE c.phone_e164 = '+639175550301'`,
			`SELECT count(*) FROM club_players cp JOIN player_private_contacts c ON c.player_id = cp.player_id WHERE c.phone_e164 = '+639175550301' AND cp.club_id = '` + birdie + `'`,
		} {
			if n := count(t, e, q); n != 1 {
				t.Fatalf("round %d: %d rows of %s", i, n, q)
			}
		}
	}
}

// Two attempts for one email with different phones: the locks on the email serialize them, one registers, the other is the
// match, and the email has one contact.
func TestTwoAttemptsForOneEmailMakeOneAccount(t *testing.T) {
	e := newEnv(t)
	for i := 0; i < 4; i++ {
		e.Reseed(t, writetest.ReadSeed(t, testdata, "player.seed.sql"), nil)
		out := e.DoAll([]writetest.Request{request(attempt1, birdie, nil), request(attempt2, birdie, values{"phone": "0917 555 0302"})})
		registered, matched := 0, 0
		for _, w := range out {
			switch decode(t, w)["status"] {
			case "registered":
				registered++
			case "account-match":
				matched++
			default:
				t.Fatalf("%d %s", w.Code, w.Body)
			}
		}
		if registered != 1 || matched != 1 {
			t.Fatalf("round %d: %d registered, %d matched", i, registered, matched)
		}
		if n := count(t, e, `SELECT count(*) FROM player_private_contacts WHERE email = 'newbie@example.test'`); n != 1 {
			t.Fatalf("%d contacts", n)
		}
	}
}

// R4: the claim's budget, 30 an hour per address; the TypeScript route has no limit. A refusal is the 429 envelope with
// Retry-After and counts before the body is read.
func TestTheClaimsPerAddressLimitApplies(t *testing.T) {
	e := newEnv(t)
	bad := writetest.Request{Method: "POST", Path: "/api/register/" + birdie + "?k=BIRDIE2026", App: "player", Body: "not json"}
	for i := 1; i <= 30; i++ {
		if w := e.Do(bad); w.Code != 422 {
			t.Fatalf("request %d: %d", i, w.Code)
		}
	}
	w := e.Do(bad)
	if w.Code != 429 || w.Header().Get("Retry-After") == "" || !strings.Contains(w.Body.String(), "rate_limited") {
		t.Fatalf("%d %v %s", w.Code, w.Header(), w.Body)
	}
}

// The route answers only the Player app, and only behind the proxy.
func TestOnlyThePlayerAppAnswers(t *testing.T) {
	e := newEnv(t)
	for _, app := range []string{"", "club", "admin", "other"} {
		r := request(attempt1, birdie, nil)
		r.App = app
		if w := e.Do(r); w.Code != 404 {
			t.Fatalf("app %q: %d %s", app, w.Code, w.Body)
		}
	}
	r := request(attempt1, birdie, nil)
	r.NoSecret = true
	if w := e.Do(r); w.Code != 404 {
		t.Fatalf("no proxy secret: %d", w.Code)
	}
	if n := count(t, e, `SELECT count(*) FROM player_claim_links`); n != 0 {
		t.Fatal("a refused request staged a link")
	}
}

// Only POST is served here: the page's read (GET /api/register/{clubId}) stays in the Next.js app.
func TestOnlyPostIsServed(t *testing.T) {
	e := newEnv(t)
	w := e.Do(writetest.Request{Method: "GET", Path: "/api/register/" + birdie + "?k=BIRDIE2026", App: "player"})
	if w.Code == 200 {
		t.Fatalf("GET answered %d", w.Code)
	}
}

// finishRegistration: linking the clubs' records and joining the club happen after the account is made and never fail the
// answer; a failure is logged and the player can tap Join from the same link.
func TestAFailedLinkOrJoinStepDoesNotFailTheRegistration(t *testing.T) {
	e := newEnv(t, unclaimedRecords...)
	e.Exec(t, `CREATE FUNCTION refuse_club_players() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'refused'; END $$;
		CREATE TRIGGER refuse_update BEFORE UPDATE ON club_players FOR EACH ROW EXECUTE FUNCTION refuse_club_players();
		CREATE TRIGGER refuse_insert BEFORE INSERT ON club_players FOR EACH ROW EXECUTE FUNCTION refuse_club_players();`)
	w := e.Do(request(attempt1, smash, nil))
	if w.Code != 200 || decode(t, w)["status"] != "registered" || cookie(w, "rotra-player-access") == nil {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if n := count(t, e, `SELECT count(*) FROM club_players WHERE player_id IN (SELECT player_id FROM player_private_contacts WHERE phone_e164 = '+639175550301')`); n != 0 {
		t.Fatalf("%d club rows", n)
	}
	if n := count(t, e, `SELECT count(*) FROM club_players WHERE player_id IS NULL AND display_name = 'Newbie Tan'`); n != 1 {
		t.Fatal("the record was linked although the step failed")
	}
}

var unclaimedRecords = []string{
	`INSERT INTO club_players (id, club_id, player_id, display_name, nickname, added_at, updated_at) VALUES ('e7000000-0000-4000-8000-0000000000a1', '` + smash + `', NULL, 'Newbie Tan', 'Newb', now(), now())`,
	`INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, state, captured_at, updated_at) VALUES ('e7000000-0000-4000-8000-0000000000a1', '` + smash + `', '+639175550301', 'pending', now(), now())`,
}
