package claim_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
)

const phoneA = "+639175550142"

// claimed is what a successful claim answers: playerId, rtrId, firstName and the session the app reads.
type claimed struct {
	PlayerID uuid.UUID
	RTRID    string
	Body     map[string]any
}

func (e *env) mustClaim(t testing.TB, token, body string, mut ...func(*req)) claimed {
	t.Helper()
	w := e.post(token, body, mut...)
	if w.Code != http.StatusOK {
		t.Fatalf("claim: %d %s", w.Code, w.Body.String())
	}
	m := decode(t, w).(map[string]any)
	return claimed{PlayerID: uuid.MustParse(m["playerId"].(string)), RTRID: m["rtrId"].(string), Body: m}
}

// P-CLAIM submit from a club record's link (completeRecordClaim + registerFromClaim): one transaction creates the
// claimed player, its contacts, the RTR ID for the inviting club's founding city, the sign-in identity and
// account, links this record and every other club's record with the same phone, saves the details and consumes
// the link; then the player is signed in.
func TestPostRecordClaim(t *testing.T) {
	e := newEnv(t)
	clubA, clubB, clubC := e.club(t, "Lahug Smash Club"), e.club(t, "Other Club"), e.club(t, "Third Club")
	token, recA := e.recordLink(t, clubA, recordOpts{name: "Ana R.", nickname: "A", phone: phoneA, email: "preset@club.test"})
	_, recB := e.recordLink(t, clubB, recordOpts{name: "Ana from B", phone: phoneA, inputState: "conflicted"})
	_, recC := e.recordLink(t, clubC, recordOpts{name: "Someone else", phone: "+639175550143"})

	w := e.post(token, claimBody(obj{
		"email": " Ana@Example.COM ", "fullName": " Ana M. Reyes ", "nickname": "Nana", "playingStyle": " baseline ",
		"experienceYears": 2, "experienceMonths": 3, "socialLinks": obj{"facebook": "https://facebook.com/ana", "instagram": "", "youtube": "", "linkedin": ""},
	}))
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	body := decode(t, w).(map[string]any)
	playerID := uuid.MustParse(body["playerId"].(string))
	wantJSON(t, w, obj{
		"playerId": playerID.String(), "rtrId": "RTR-PH-CEB-111726-0001", "firstName": "Nana",
		"session": obj{"account": obj{"id": playerID.String(), "name": "Ana M. Reyes", "audience": "player"}},
	})
	if got := w.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Errorf("Cache-Control %q", got)
	}

	// the browser holds both passes, host-only and HttpOnly, the refresh one for the auth endpoints only
	access, refresh := cookie(w, "rotra-player-access"), cookie(w, "rotra-player-refresh")
	if access == nil || refresh == nil || access.Path != "/" || refresh.Path != session.RefreshCookiePath || !access.HttpOnly || !refresh.HttpOnly || access.Domain != "" {
		t.Fatalf("cookies: %+v %+v", access, refresh)
	}
	if access.MaxAge != refresh.MaxAge { // B-62 amendment: the access cookie lives as long as the refresh cookie
		t.Fatalf("access Max-Age %d, refresh Max-Age %d", access.MaxAge, refresh.MaxAge)
	}
	if got := e.get2(t, "/api/auth/session", access); got != "Ana M. Reyes" {
		t.Fatalf("the session reads as %q", got)
	}

	// players: claimed, the details saved (revision 1 -> 2), the experience recorded now
	var (
		full, nickname, state, details string
		rev                            int64
		months                         int32
		recorded                       time.Time
		version                        int32
	)
	if err := e.pool.QueryRow(e.ctx, `SELECT full_name, nickname, profile_state::text, personal_details::text, details_version, revision, experience_months, experience_recorded_at FROM players WHERE id = $1`, playerID).
		Scan(&full, &nickname, &state, &details, &version, &rev, &months, &recorded); err != nil {
		t.Fatal(err)
	}
	if full != "Ana M. Reyes" || nickname != "Nana" || state != "claimed" || details != `{"playingStyle": "baseline"}` || version != 1 || rev != 2 || months != 27 || !recorded.Equal(base) {
		t.Fatalf("player: %q %q %q %q %d %d %d %v", full, nickname, state, details, version, rev, months, recorded)
	}
	var fb string
	if err := e.pool.QueryRow(e.ctx, `SELECT url FROM player_social_links WHERE player_id = $1`, playerID).Scan(&fb); err != nil || fb != "https://facebook.com/ana" {
		t.Fatalf("link %q %v", fb, err)
	}
	// private contact: the club's phone, the player's email in lower case, unverified
	var phone, email string
	var crev int64
	var verified *time.Time
	if err := e.pool.QueryRow(e.ctx, `SELECT phone_e164, email, revision, email_verified_at FROM player_private_contacts WHERE player_id = $1`, playerID).Scan(&phone, &email, &crev, &verified); err != nil {
		t.Fatal(err)
	}
	if phone != phoneA || email != "ana@example.com" || crev != 1 || verified != nil {
		t.Fatalf("contact: %q %q %d %v", phone, email, crev, verified)
	}
	// the RTR ID: the inviting club's founding city and the sync day
	var creating uuid.UUID
	var seq int32
	if err := e.pool.QueryRow(e.ctx, `SELECT creating_club_id, sequence FROM player_id_allocations WHERE player_id = $1`, playerID).Scan(&creating, &seq); err != nil || creating != clubA || seq != 1 {
		t.Fatalf("allocation: %v %d %v", creating, seq, err)
	}
	// identity and account
	var identID uuid.UUID
	var loginKey, scheme, hash string
	if err := e.pool.QueryRow(e.ctx, `SELECT id, login_key, password_scheme, password_hash FROM auth_identities WHERE audience = 'player'`).Scan(&identID, &loginKey, &scheme, &hash); err != nil {
		t.Fatal(err)
	}
	if ok, _, err := password.Verify(goodPass, hash); loginKey != "ana@example.com" || scheme != "argon2id" || !ok || err != nil {
		t.Fatalf("identity: %q %q %v %v", loginKey, scheme, ok, err)
	}
	var provider string
	var subject uuid.UUID
	var claimedAt time.Time
	var sync int64
	if err := e.pool.QueryRow(e.ctx, `SELECT auth_provider, auth_subject, claimed_at, contact_sync_version FROM player_accounts WHERE player_id = $1`, playerID).Scan(&provider, &subject, &claimedAt, &sync); err != nil {
		t.Fatal(err)
	}
	if provider != "rotra" || subject != identID || !claimedAt.Equal(base) || sync != 1 {
		t.Fatalf("account: %q %v %v %d", provider, subject, claimedAt, sync)
	}
	// records: this one and the other club's with the same phone are linked and resolved; the third is not
	for name, rec := range map[string]uuid.UUID{"A": recA, "B": recB} {
		var p *uuid.UUID
		var r int64
		var st string
		if err := e.pool.QueryRow(e.ctx, `SELECT cp.player_id, cp.revision, pi.state::text FROM club_players cp JOIN club_player_private_inputs pi ON pi.club_player_id = cp.id WHERE cp.id = $1`, rec).Scan(&p, &r, &st); err != nil {
			t.Fatal(err)
		}
		if p == nil || *p != playerID || r != 2 || st != "resolved" {
			t.Errorf("record %s: %v %d %s", name, p, r, st)
		}
	}
	if e.count(t, `SELECT count(*) FROM club_players WHERE id = $1 AND player_id IS NULL`, recC) != 1 {
		t.Error("the third club's record must stay unlinked")
	}
	// the link is consumed
	var ls string
	var consumed time.Time
	var lrev int64
	if err := e.pool.QueryRow(e.ctx, `SELECT state::text, consumed_at, revision FROM club_player_claim_links WHERE club_player_id = $1`, recA).Scan(&ls, &consumed, &lrev); err != nil || ls != "consumed" || !consumed.Equal(base) || lrev != 2 {
		t.Fatalf("link: %q %v %d %v", ls, consumed, lrev, err)
	}
	// one session and its sign_in event; nothing else was created
	if e.count(t, `SELECT count(*) FROM auth_sessions WHERE identity_id = $1`, identID) != 1 || e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'sign_in' AND identity_id = $1`, identID) != 1 {
		t.Fatal("one session and one sign_in event")
	}
	// the email signs in afterwards, in any case and with stray spaces: the login key is the sign-in's
	in := e.do(req{method: "POST", path: "/api/auth/sign-in", app: "player", body: cred(" ANA@example.com ", goodPass)})
	if in.Code != http.StatusOK {
		t.Fatalf("signing in with the claimed login: %d %s", in.Code, in.Body.String())
	}
}

func cred(identifier, pw string) string {
	return claimBodyRaw(obj{"identifier": identifier, "password": pw})
}

// get2 reads GET path with the access cookie and returns the account name.
func (e *env) get2(t testing.TB, path string, c *http.Cookie) string {
	t.Helper()
	w := e.do(req{method: "GET", path: path, app: "player", cookies: []*http.Cookie{c}})
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	acct, _ := decode(t, w).(map[string]any)["account"].(map[string]any)
	if acct == nil {
		t.Fatalf("signed out: %s", w.Body.String())
	}
	return acct["name"].(string)
}

// A player's link (a staged `players` row): the contact's email is replaced and unverified, the account maps to the
// existing player, and nothing is allocated or linked: the RTR ID and other clubs' records are not part of this
// branch.
func TestPostPlayerClaim(t *testing.T) {
	e := newEnv(t)
	club, other := e.club(t, "Lahug Smash Club"), e.club(t, "Other Club")
	token, id := e.playerLink(t, club, playerOpts{
		name: "Ben Cruz", phone: phoneA, email: "staged@club.test", style: "old style", expMonths: i32(20),
		expRecorded: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
		links:       map[string]string{"facebook": "https://facebook.com/old", "youtube": "https://youtube.com/@old"},
	})
	_, otherRec := e.recordLink(t, other, recordOpts{name: "Ben at Other", phone: phoneA})
	e.exec(t, `UPDATE player_private_contacts SET email_verified_at = $2 WHERE player_id = $1`, id, base)
	var rtr string
	if err := e.pool.QueryRow(e.ctx, `SELECT rtr_id FROM player_id_allocations WHERE player_id = $1`, id).Scan(&rtr); err != nil {
		t.Fatal(err)
	}
	counters := e.count(t, `SELECT coalesce(sum(last_sequence), 0) FROM player_id_counters`)

	w := e.post(token, claimBody(obj{
		"email": "ben@example.com", "fullName": "Ben Cruz", "nickname": "", "playingStyle": "new style",
		"experienceYears": 2, "experienceMonths": 6, // 30 months: what the form showed, so the snapshot stays
		"socialLinks": obj{"facebook": "https://facebook.com/new", "instagram": "https://instagram.com/ben", "youtube": "", "linkedin": ""},
	}))
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantJSON(t, w, obj{
		"playerId": id.String(), "rtrId": rtr, "firstName": "Ben",
		"session": obj{"account": obj{"id": id.String(), "name": "Ben Cruz", "audience": "player"}},
	})
	if e.count(t, `SELECT count(*) FROM player_id_allocations`) != 1 || e.count(t, `SELECT coalesce(sum(last_sequence), 0) FROM player_id_counters`) != counters {
		t.Error("no RTR ID is allocated for a player's link")
	}
	var email string
	var crev int64
	var verified *time.Time
	if err := e.pool.QueryRow(e.ctx, `SELECT email, revision, email_verified_at FROM player_private_contacts WHERE player_id = $1`, id).Scan(&email, &crev, &verified); err != nil {
		t.Fatal(err)
	}
	if email != "ben@example.com" || crev != 2 || verified != nil {
		t.Fatalf("contact: %q %d %v", email, crev, verified)
	}
	var sync int64
	var subject uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT contact_sync_version, auth_subject FROM player_accounts WHERE player_id = $1`, id).Scan(&sync, &subject); err != nil || sync != 2 {
		t.Fatalf("account: %d %v", sync, err)
	}
	if e.count(t, `SELECT count(*) FROM auth_identities WHERE id = $1 AND login_key = 'ben@example.com'`, subject) != 1 {
		t.Fatal("the account's subject is the new identity")
	}
	var state string
	var rev int64
	var months int32
	var recorded time.Time
	var nickname *string
	var details string
	if err := e.pool.QueryRow(e.ctx, `SELECT profile_state::text, revision, experience_months, experience_recorded_at, nickname, personal_details::text FROM players WHERE id = $1`, id).Scan(&state, &rev, &months, &recorded, &nickname, &details); err != nil {
		t.Fatal(err)
	}
	if state != "claimed" || rev != 3 || months != 20 || !recorded.Equal(time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)) || nickname != nil || details != `{"playingStyle": "new style"}` {
		t.Fatalf("player: %s %d %d %v %v %q", state, rev, months, recorded, nickname, details)
	}
	links := map[string]string{}
	rows, err := e.pool.Query(e.ctx, `SELECT provider::text, url FROM player_social_links WHERE player_id = $1`, id)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var p, u string
		if err := rows.Scan(&p, &u); err != nil {
			t.Fatal(err)
		}
		links[p] = u
	}
	rows.Close()
	if len(links) != 2 || links["facebook"] != "https://facebook.com/new" || links["instagram"] != "https://instagram.com/ben" {
		t.Fatalf("links: %v", links)
	}
	if e.count(t, `SELECT count(*) FROM club_players WHERE id = $1 AND player_id IS NULL`, otherRec) != 1 {
		t.Error("another club's record with the same phone is not linked by a player's link")
	}
	if e.count(t, `SELECT count(*) FROM player_claim_links WHERE player_id = $1 AND state = 'consumed' AND revision = 2`, id) != 1 {
		t.Error("the link is consumed")
	}
}

// A player with no contact takes the typed phone; the email is stored with it and the account's sync version is
// the new contact's revision.
func TestPostPlayerClaimWithoutContact(t *testing.T) {
	e := newEnv(t)
	token, id := e.playerLink(t, e.club(t, "Club"), playerOpts{})
	got := e.mustClaim(t, token, claimBody(obj{"phone": "0917 555 0142"}))
	if got.PlayerID != id {
		t.Fatalf("%v", got.PlayerID)
	}
	var phone, email string
	var rev int64
	if err := e.pool.QueryRow(e.ctx, `SELECT phone_e164, email, revision FROM player_private_contacts WHERE player_id = $1`, id).Scan(&phone, &email, &rev); err != nil || phone != phoneA || email != "ana@example.com" || rev != 1 {
		t.Fatalf("%q %q %d %v", phone, email, rev, err)
	}
	if e.count(t, `SELECT count(*) FROM player_accounts WHERE player_id = $1 AND contact_sync_version = 1`, id) != 1 {
		t.Fatal("sync version")
	}
}

// The phone on file is never replaced by the typed one; a record without one takes the typed number.
func TestPostPhoneOnFileWins(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	onFile, _ := e.recordLink(t, club, recordOpts{phone: phoneA})
	got := e.mustClaim(t, onFile, claimBody(obj{"phone": "09175550199", "email": "one@example.com"}))
	var phone string
	if err := e.pool.QueryRow(e.ctx, `SELECT phone_e164 FROM player_private_contacts WHERE player_id = $1`, got.PlayerID).Scan(&phone); err != nil || phone != phoneA {
		t.Fatalf("%q %v", phone, err)
	}
	none, rec := e.recordLink(t, club, recordOpts{})
	got = e.mustClaim(t, none, claimBody(obj{"phone": "09175550188", "email": "two@example.com"}))
	if err := e.pool.QueryRow(e.ctx, `SELECT phone_e164 FROM player_private_contacts WHERE player_id = $1`, got.PlayerID).Scan(&phone); err != nil || phone != "+639175550188" {
		t.Fatalf("%q %v", phone, err)
	}
	if e.count(t, `SELECT count(*) FROM club_players WHERE id = $1 AND player_id = $2`, rec, got.PlayerID) != 1 {
		t.Fatal("the record is linked")
	}
}

// A retry after success (a lost response, a double tap) signs in again with the same password: it returns the
// same result, creates nothing, saves no details again, and issues a new session.
func TestPostRetryAfterSuccess(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	rtok, _ := e.recordLink(t, club, recordOpts{phone: phoneA})
	ptok, _ := e.playerLink(t, club, playerOpts{phone: "+639175550143"})
	for name, token := range map[string]string{"record": rtok, "player": ptok} {
		email := name + "@example.com"
		first := e.mustClaim(t, token, claimBody(obj{"email": email, "fullName": "First Name"}))
		before := e.count(t, `SELECT count(*) FROM players`) + e.count(t, `SELECT count(*) FROM auth_identities`)*100
		w := e.post(token, claimBody(obj{"email": " " + name + "@EXAMPLE.com", "fullName": "Changed Name", "nickname": "Nick"}))
		if w.Code != http.StatusOK {
			t.Fatalf("%s retry: %d %s", name, w.Code, w.Body.String())
		}
		wantJSON(t, w, obj{
			"playerId": first.PlayerID.String(), "rtrId": first.RTRID, "firstName": "First",
			"session": obj{"account": obj{"id": first.PlayerID.String(), "name": "First Name", "audience": "player"}},
		})
		if cookie(w, "rotra-player-access") == nil || cookie(w, "rotra-player-refresh") == nil {
			t.Fatalf("%s: the retry signs in", name)
		}
		if after := e.count(t, `SELECT count(*) FROM players`) + e.count(t, `SELECT count(*) FROM auth_identities`)*100; after != before {
			t.Fatalf("%s: the retry created something", name)
		}
		if e.count(t, `SELECT count(*) FROM players WHERE id = $1 AND full_name = 'First Name'`, first.PlayerID) != 1 {
			t.Fatalf("%s: the retry saved details", name)
		}
		if e.count(t, `SELECT count(*) FROM auth_sessions s JOIN player_accounts a ON a.auth_subject = s.identity_id WHERE a.player_id = $1`, first.PlayerID) != 2 {
			t.Fatalf("%s: two sessions", name)
		}
	}
}

// A consumed link is not a way in: without the right password for the right login, nobody is signed in, and the
// answer never tells which part was wrong or whether the email has an account.
func TestPostRetryNeedsThePassword(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	token, _ := e.recordLink(t, club, recordOpts{phone: phoneA})
	e.mustClaim(t, token, claimBody(nil)) // ana@example.com / goodPass
	otherTok, _ := e.recordLink(t, club, recordOpts{phone: "+639175550143"})
	e.mustClaim(t, otherTok, claimBody(obj{"email": "other@example.com", "password": "other-password"}))
	sessions := e.count(t, `SELECT count(*) FROM auth_sessions`)

	for name, body := range map[string]obj{
		"wrong password":                {"password": "not the password"},
		"empty-ish password":            {"password": "      "},
		"another email, no account":     {"email": "nobody@example.com"},
		"another player's login":        {"email": "other@example.com"},
		"another player's password":     {"password": "other-password"},
		"the other login, its password": {"email": "other@example.com", "password": "other-password"},
	} {
		w := e.post(token, claimBody(body))
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
			continue
		}
		wantErr(t, w, http.StatusUnprocessableEntity, "invalid", fields1("email", msgCredentials))
		if len(w.Result().Cookies()) != 0 {
			t.Errorf("%s: cookies were set", name)
		}
	}
	if e.count(t, `SELECT count(*) FROM auth_sessions`) != sessions {
		t.Fatal("no session may be issued")
	}
	// the right password still works after the failures
	if w := e.post(token, claimBody(nil)); w.Code != http.StatusOK {
		t.Fatalf("%d", w.Code)
	}
}

// A consumed link whose player has no sign-in (a data fault), a disabled identity and a disabled account are the
// same refusal, without a session.
func TestPostRetryRefusedForBrokenAccounts(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	noAccount, _ := e.recordLink(t, club, recordOpts{phone: phoneA, linkedTo: e.playerOnly(t), state: "consumed"})
	wantErr(t, e.post(noAccount, claimBody(nil)), http.StatusUnprocessableEntity, "invalid", fields1("email", msgCredentials))

	for name, sql := range map[string]string{
		"identity disabled": `UPDATE auth_identities SET disabled_at = now()`,
		"account disabled":  `UPDATE player_accounts SET disabled_at = now()`,
	} {
		tok, _ := e.recordLink(t, club, recordOpts{phone: e.phone()})
		email := strings.ReplaceAll(name, " ", "-") + "@example.com"
		e.mustClaim(t, tok, claimBody(obj{"email": email}))
		e.exec(t, sql)
		w := e.post(tok, claimBody(obj{"email": email}))
		if w.Code != http.StatusUnprocessableEntity || len(w.Result().Cookies()) != 0 {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
		}
		e.exec(t, `UPDATE auth_identities SET disabled_at = NULL`)
		e.exec(t, `UPDATE player_accounts SET disabled_at = NULL`)
	}
}

// Guessing the password through a used link is bounded by the account's wrong-password lock (5 per 15 minutes):
// once locked, even the right password is a 429.
func TestPostRetryLocksAfterWrongPasswords(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	e.mustClaim(t, token, claimBody(nil))
	for i := 0; i < 5; i++ {
		wantErr(t, e.post(token, claimBody(obj{"password": "wrong password"})), http.StatusUnprocessableEntity, "invalid", fields1("email", msgCredentials))
	}
	w := e.post(token, claimBody(nil))
	if w.Code != http.StatusTooManyRequests || w.Header().Get("Retry-After") == "" || len(w.Result().Cookies()) != 0 {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	e.clk.Advance(16 * time.Minute)
	if w := e.post(token, claimBody(nil)); w.Code != http.StatusOK {
		t.Fatalf("after the window: %d %s", w.Code, w.Body.String())
	}
}

// If signing in fails after the claim committed (a session store hiccup), the answer is 503 and no cookie, the
// account exists, and the retry, which now takes the consumed-link branch, signs the player in.
func TestPostIssueFailureAfterCommitIsRecoverable(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	e.exec(t, `CREATE FUNCTION no_sessions() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'sessions are down'; END $$`)
	e.exec(t, `CREATE TRIGGER no_sessions BEFORE INSERT ON auth_sessions FOR EACH ROW EXECUTE FUNCTION no_sessions()`)
	w := e.post(token, claimBody(nil))
	wantErr(t, w, http.StatusServiceUnavailable, "unavailable", nil)
	if len(w.Result().Cookies()) != 0 {
		t.Fatal("no cookies")
	}
	if e.count(t, `SELECT count(*) FROM player_accounts`) != 1 || e.count(t, `SELECT count(*) FROM club_player_claim_links WHERE state = 'consumed'`) != 1 {
		t.Fatal("the claim itself committed")
	}
	e.exec(t, `DROP TRIGGER no_sessions ON auth_sessions`)
	got := e.mustClaim(t, token, claimBody(nil))
	if e.count(t, `SELECT count(*) FROM players WHERE id = $1 AND profile_state = 'claimed'`, got.PlayerID) != 1 || e.count(t, `SELECT count(*) FROM auth_sessions`) != 1 {
		t.Fatal("the retry signs in")
	}
}

// Failures in the store itself are not hidden: the limiter being down is a 503, like sign-in.
func TestPostStoreDown(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	e.pool.Close()
	wantErr(t, e.post(token, claimBody(nil)), http.StatusServiceUnavailable, "unavailable", nil)
}
