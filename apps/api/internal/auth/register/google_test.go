package register_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/register"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Google registration (D-2026-11-16-01): the same staging, link rules and joins as the password registration, with the Google
// account the callback verified and holds. The held account is a signed cookie (the callback sets it, internal/auth/google), so
// these tests sign one with the same key the routes check. Nothing here talks to Google.

var sealerKey = func() ed25519.PrivateKey {
	_, k, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		panic(err)
	}
	return k
}()

func buildGoogle(pool *pgxpool.Pool, svc *session.Service, st *store.Store, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	deps := register.Deps{Pool: pool, Service: svc, Store: st, Logger: log, Clock: now}
	g, err := google.New(google.Deps{Pool: pool, Service: svc, Store: st, Sealer: google.NewSealer(sealerKey), RedirectBase: "https://player.test", Clock: now, Logger: log})
	if err != nil {
		panic(err)
	}
	password, err := register.Register(deps)
	if err != nil {
		panic(err)
	}
	withGoogle, err := register.RegisterGoogle(deps, g)
	if err != nil {
		panic(err)
	}
	return func(mux *http.ServeMux) { password(mux); withGoogle(mux) }
}

func newGoogleEnv(t *testing.T, flagOn bool, scenario ...string) *writetest.Env {
	t.Helper()
	e := writetest.NewEnvFull(t, now, buildGoogle)
	e.Players = true
	e.Reseed(t, writetest.ReadSeed(t, testdata, "player.seed.sql"), scenario)
	e.Exec(t, `INSERT INTO feature_flags (key, name, description, value, updated_at) VALUES ('player_google_sign_in', 'Google sign-in', 'Test', $1, now())
	  ON CONFLICT (key) DO UPDATE SET value = $1`, flagOn)
	return e
}

func held(email string) string {
	v := google.NewSealer(sealerKey).Seal("held", google.Held{Email: email, Name: "Gina Google"}, now)
	return google.HeldCookie + "=" + v
}

func googleRequest(club string, cookie string, over values) writetest.Request {
	v := form(over)
	delete(v, "email")
	delete(v, "password")
	body, _ := json.Marshal(map[string]any{"values": v})
	r := writetest.Request{Method: "POST", Path: "/api/register/" + club + "/google?k=" + map[string]string{birdie: "BIRDIE2026", smash: "SMASHSS123"}[club], App: "player", Body: string(body)}
	if cookie != "" {
		r.Headers = map[string]string{"Cookie": cookie}
	}
	return r
}

func TestGoogleRegistrationMakesALoginWithNoPasswordAndSignsThePlayerIn(t *testing.T) {
	e := newGoogleEnv(t, true)
	w := e.Do(googleRequest(birdie, held("gina@example.test"), nil))
	if w.Code != 200 || decode(t, w)["status"] != "registered" {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	var google, rotra, hash string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT a.google_email, c.email, i.password_hash FROM player_accounts a
	  JOIN player_private_contacts c ON c.player_id = a.player_id JOIN auth_identities i ON i.id = a.auth_subject
	  WHERE c.phone_e164 = '+639175550301'`).Scan(&google, &rotra, &hash); err != nil {
		t.Fatal(err)
	}
	if google != "gina@example.test" || rotra != "gina@example.test" || hash != "" {
		t.Fatalf("google %q rotra %q hash %q", google, rotra, hash)
	}
	for _, name := range []string{"rotra-player-access", "rotra-player-refresh"} {
		if c := cookie(w, name); c == nil || c.Value == "" || !c.HttpOnly {
			t.Fatalf("cookie %s: %+v", name, c)
		}
	}
	if c := cookie(w, google2HeldName); c == nil || c.MaxAge >= 0 {
		t.Fatalf("the held Google account is dropped once used: %+v", c)
	}
	if n := count(t, e, `SELECT count(*) FROM club_players cp JOIN player_private_contacts c ON c.player_id = cp.player_id WHERE cp.club_id = $1::uuid AND c.phone_e164 = '+639175550301'`, birdie); n != 1 {
		t.Fatalf("the player joins the club the link is from: %d", n)
	}
	// Nothing about a password: the body never carried one, and the password route does not open this login.
	pw := e.Do(writetest.Request{Method: "POST", Path: "/api/auth/sign-in", App: "player", Body: `{"identifier":"gina@example.test","password":"correct horse"}`})
	if pw.Code == 200 {
		t.Fatal("a login made with Google opened with a password")
	}
}

const google2HeldName = "rotra-player-google-held"

func TestGoogleRegistrationIsNotFoundWhileTheFlagIsOffAndForOtherApps(t *testing.T) {
	e := newGoogleEnv(t, false)
	if w := e.Do(googleRequest(birdie, held("gina@example.test"), nil)); w.Code != 404 {
		t.Fatalf("flag off: %d", w.Code)
	}
	e = newGoogleEnv(t, true)
	r := googleRequest(birdie, held("gina@example.test"), nil)
	r.App = "queue"
	if w := e.Do(r); w.Code != 404 {
		t.Fatalf("another app: %d", w.Code)
	}
	if n := count(t, e, `SELECT count(*) FROM player_accounts a JOIN player_private_contacts c ON c.player_id = a.player_id WHERE c.phone_e164 = '+639175550301'`); n != 0 {
		t.Fatal("an account was made")
	}
}

func TestGoogleRegistrationNeedsTheHeldAccountThatNoRotraAccountHas(t *testing.T) {
	e := newGoogleEnv(t, true)
	// alice@... is the seed's connected Google (player.seed.sql): an account has it, so it is not a new Google account.
	var aliceGoogle string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT google_email FROM player_accounts WHERE google_email IS NOT NULL LIMIT 1`).Scan(&aliceGoogle); err != nil {
		t.Fatal(err)
	}
	for name, cookie := range map[string]string{
		"nothing held":      "",
		"a forged cookie":   google2HeldName + "=eyJrIjoiaGVsZCJ9.AAAA",
		"an account has it": held(aliceGoogle),
	} {
		w := e.Do(googleRequest(birdie, cookie, nil))
		if w.Code != 422 || !strings.Contains(w.Body.String(), "Couldn't finish with Google") || len(w.Result().Cookies()) != 0 {
			t.Errorf("%s: %d %s", name, w.Code, w.Body)
		}
	}
}

func TestGoogleRegistrationKeepsTheHeldAccountWhenThePhoneBelongsToAnAccount(t *testing.T) {
	e := newGoogleEnv(t, true)
	w := e.Do(googleRequest(birdie, held("gina@example.test"), values{"phone": "0917 555 0002"}))
	if w.Code != 200 || decode(t, w)["status"] != "account-match" || len(w.Result().Cookies()) != 0 {
		t.Fatalf("%d %s %v", w.Code, w.Body, w.Result().Cookies())
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE audience = 'player'`); n != 0 {
		t.Fatalf("%d sessions", n)
	}
}

func TestGoogleRegistrationChecksTheFormAndTheLinkBeforeStaging(t *testing.T) {
	e := newGoogleEnv(t, true)
	bad := e.Do(googleRequest(birdie, held("gina@example.test"), values{"fullName": "", "phone": "12"}))
	if bad.Code != 422 {
		t.Fatalf("%d %s", bad.Code, bad.Body)
	}
	fields := decode(t, bad)["error"].(map[string]any)["fields"].(map[string]any)
	if fields["fullName"] == nil || fields["phone"] == nil || fields["email"] != nil || fields["password"] != nil || fields["attempt"] != nil {
		t.Fatalf("only the Google form's own fields are checked: %v", fields)
	}
	// A club link needs the club's current invite code, as the password registration does.
	r := googleRequest(birdie, held("gina@example.test"), nil)
	r.Path = "/api/register/" + birdie + "/google?k=WRONG"
	if w := e.Do(r); w.Code == 200 {
		t.Fatalf("a wrong invite code registered: %s", w.Body)
	}
	if n := count(t, e, `SELECT count(*) FROM player_claim_links`); n != 0 {
		t.Fatalf("%d staging links after refusals", n)
	}
}

func TestGoogleRegistrationLosesToALoginThatWonTheEmailAfterTheCheck(t *testing.T) {
	e := newGoogleEnv(t, true)
	defer register.SetAfterStage(func() {
		e.Exec(t, `INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision)
			VALUES ('f5000000-0000-4000-8000-0000000000ff', 'player', 'gina@example.test', 'x', 'argon2id', now(), now(), now(), 1)`)
	})()
	w := e.Do(googleRequest(birdie, held("gina@example.test"), nil))
	if w.Code != 200 || decode(t, w)["status"] != "account-match" || cookie(w, "rotra-player-access") != nil {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
}

func TestGoogleRegistrationJoinsTheClubRecordsThatShareThePhone(t *testing.T) {
	e := newGoogleEnv(t, true, unclaimedRecords...)
	w := e.Do(googleRequest(smash, held("gina@example.test"), nil))
	if w.Code != 200 || decode(t, w)["status"] != "registered" {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if n := count(t, e, `SELECT count(*) FROM club_players WHERE id = 'e7000000-0000-4000-8000-0000000000a1' AND player_id IS NOT NULL`); n != 1 {
		t.Fatal("the club's record with this phone joined the new account")
	}
}

// sharedByTwoClubs is a Google email that two clubs saved (one open shared entry, one record in each club): the seed's "shared_entry" scenario of the
// register cases, with the held account's email.
func sharedByTwoClubs(t *testing.T) []string {
	t.Helper()
	raw, err := os.ReadFile(testdata + "/register.cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var doc struct {
		Scenarios map[string][]string `json:"scenarios"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	out := make([]string, 0, len(doc.Scenarios["shared_entry"]))
	for _, q := range doc.Scenarios["shared_entry"] {
		out = append(out, strings.ReplaceAll(q, "shared@example.test", "gina@example.test"))
	}
	return out
}

// The identity card picked when several clubs saved the Google email (D-2026-11-16-04) is read by the Route Handler and passed on, and
// claimSharedEntry (shared-entry.ts) ignores it: "the pick only seeded the form; a stale pick never blocks the join". So the registration
// is the same with no pick, with a pick of either club's record, and with a pick that names no record, a text that is no id, or a value
// that is no text (the Route Handler reads that as no pick).
func TestGoogleRegistrationIgnoresTheIdentityCardPicked(t *testing.T) {
	const (
		smashRecord = "e7000000-0000-4000-8000-0000000000b1"
		otherRecord = "e7000000-0000-4000-8000-0000000000b2"
	)
	picks := []struct {
		name string
		pick any // nil leaves the field out
	}{
		{"none", nil},
		{"null", json.RawMessage("null")},
		{"the record of the club the link is from", smashRecord},
		{"the record of the other club", otherRecord},
		{"an id of no record", "e7000000-0000-4000-8000-0000000000ff"},
		{"a text that is no id", "not-an-id"},
		{"an empty text", ""},
		{"a number", 7},
		{"a list", []string{smashRecord}},
	}
	for _, p := range picks {
		t.Run(p.name, func(t *testing.T) {
			e := newGoogleEnv(t, true, sharedByTwoClubs(t)...)
			req := googleRequest(smash, held("gina@example.test"), nil)
			if p.pick != nil {
				var body map[string]any
				if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
					t.Fatal(err)
				}
				body["identityRecordId"] = p.pick
				raw, _ := json.Marshal(body)
				req.Body = string(raw)
			}
			w := e.Do(req)
			got := decode(t, w)
			if w.Code != 200 || got["status"] != "registered" {
				t.Fatalf("%d %s", w.Code, w.Body)
			}
			if got["rtrId"] != "RTR-PH-CEB-102926-0041" {
				t.Fatalf("the entry's RTR ID stays: %v", got["rtrId"])
			}
			joined, _ := got["joinedClubs"].([]any)
			if len(joined) != 2 {
				t.Fatalf("both clubs that saved the email joined: %v", got["joinedClubs"])
			}
			if n := count(t, e, `SELECT count(*) FROM club_players WHERE shared_entry_id = '5e000000-0000-4000-8000-000000000001' AND player_id IS NOT NULL`); n != 2 {
				t.Fatalf("both records linked to the new account: %d", n)
			}
			if n := count(t, e, `SELECT count(*) FROM shared_player_entries WHERE id = '5e000000-0000-4000-8000-000000000001' AND claimed_player_id IS NOT NULL AND email IS NULL`); n != 1 {
				t.Fatal("the entry is claimed and its email cleared")
			}
		})
	}
}

var _ = httptest.NewRecorder
