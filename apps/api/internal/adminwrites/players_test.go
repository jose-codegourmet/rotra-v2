package adminwrites_test

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// What the golden files of the player writes cannot pin, because the capture has no Supabase: the sign-in identity that
// the email and the password of an Edit change (auth_identities), the sessions that end, and the writes that race. The
// golden files pin everything else row for row (players_golden_test.go).

const (
	hana     = "d4000000-0000-4000-8000-000000000008"
	hanaSub  = "f4000000-0000-4000-8000-000000000008"
	june     = "d4000000-0000-4000-8000-000000000010"
	alice    = "d4000000-0000-4000-8000-000000000001"
	smash    = "c9000000-0000-4000-8000-000000000001"
	entryUna = "a6000000-0000-4000-8000-000000000007"
)

// playersEnv is a test environment on testdata/players.seed.sql, and what puts it back to that seed.
func playersEnv(t *testing.T) (*writetest.Env, func()) {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "playeredit.cases.json", &cf)
	e := writetest.NewEnv(t, cf.Now, build)
	seed := writetest.ReadSeed(t, "testdata", cf.Seed)
	reset := func() { e.Reseed(t, seed, nil) }
	reset()
	return e, reset
}

// hanaForm is the Edit form as Hana's page loads it, with the changes on top.
func hanaForm(changes map[string]any) map[string]any {
	form := map[string]any{
		"picture": nil, "name": "Hana Ocampo", "nickname": "", "playingStyle": "", "experienceYears": "", "experienceMonths": "",
		"facebook": "", "instagram": "", "youtube": "", "linkedin": "", "profilePrivate": false, "phoneHidden": false,
		"phone": "+639175550008", "email": "hana@example.test", "password": "", "reason": "Corrected on request",
		"registrationPlace": "PH-CEB", "registrationDate": "2026-10-29",
	}
	for k, v := range changes {
		form[k] = v
	}
	return form
}

func editBody(t *testing.T, revision string, form map[string]any) string {
	t.Helper()
	b, err := json.Marshal(map[string]any{"revision": revision, "values": form})
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func patchPlayer(t *testing.T, e *writetest.Env, id, body string) *httptest.ResponseRecorder {
	t.Helper()
	return e.Do(writetest.Request{Method: "PATCH", Path: "/api/players/" + id, App: "admin", Bearer: e.AdminPass(t, owner), Body: body})
}

// session starts a session of the player, as sign-in does, and returns its ID.
func playerSession(t *testing.T, e *writetest.Env, subject, playerID string) uuid.UUID {
	t.Helper()
	ident, err := e.Store.GetIdentityByID(e.Ctx, uuid.MustParse(subject))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.Service.Issue(e.Ctx, session.IssueInput{Identity: ident, AccountID: uuid.MustParse(playerID), DeviceLabel: "Chrome on Android"}); err != nil {
		t.Fatal(err)
	}
	var id uuid.UUID
	if err := e.Pool.QueryRow(e.Ctx, `SELECT id FROM auth_sessions WHERE identity_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`, uuid.MustParse(subject)).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

// A password an Admin sets is the one the player signs in with: the identity of the account has the new argon2id hash
// (the shared hasher accepts it and refuses the old one), its login key is unchanged, no session of it ended (the
// TypeScript ends none), no auth event was written, and the player's revision went up with one audit event.
func TestAdminPasswordIsTheOneThePlayerSignsInWith(t *testing.T) {
	e, _ := playersEnv(t)
	live := playerSession(t, e, hanaSub, hana)
	w := patchPlayer(t, e, hana, editBody(t, "4", hanaForm(map[string]any{"password": "a-new-password"})))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"passwordSet":true`) || !strings.Contains(w.Body.String(), `"warnings":[]`) {
		t.Fatalf("save: %d %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), "a-new-password") {
		t.Error("the answer names the password")
	}
	ident, err := e.Store.GetIdentityByID(e.Ctx, uuid.MustParse(hanaSub))
	if err != nil {
		t.Fatal(err)
	}
	if ident.LoginKey != "hana@example.test" || ident.PasswordScheme != store.SchemeArgon2id || !strings.HasPrefix(ident.PasswordHash, "$argon2id$") || !ident.PasswordChangedAt.Equal(e.Clock.Now()) {
		t.Errorf("identity: %+v", ident)
	}
	if ok, _, err := testHasher().Verify(e.Ctx, "a-new-password", ident.PasswordHash); err != nil || !ok {
		t.Errorf("the new password must verify: %v %v", ok, err)
	}
	if ok, _, _ := testHasher().Verify(e.Ctx, "the old one", ident.PasswordHash); ok {
		t.Error("another password must not verify")
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE id = $1 AND revoked_at IS NULL`, live); n != 1 {
		t.Error("the session must stay")
	}
	if n := count(t, e, `SELECT count(*) FROM auth_events WHERE identity_id = $1 AND event IN ('password_changed', 'session_revoked')`, uuid.MustParse(hanaSub)); n != 0 {
		t.Errorf("%d auth events", n)
	}
	if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.password_set' AND target_id = $1 AND metadata::text NOT LIKE '%password%' || '%a-new%'`, hana); n != 1 {
		t.Errorf("%d password audit events", n)
	}
	if n := count(t, e, `SELECT revision::int FROM players WHERE id = $1`, hana); n != 5 {
		t.Errorf("revision %d, want 5", n)
	}
}

// A password a Go hash cannot be made of (over the 1024 characters the shared password rules allow) is a warning and
// writes nothing, like a provider that refuses it: no new hash, no revision, no event, the sessions stay.
func TestAPasswordThatCannotBeHashedIsAWarning(t *testing.T) {
	e, _ := playersEnv(t)
	live := playerSession(t, e, hanaSub, hana)
	w := patchPlayer(t, e, hana, editBody(t, "4", hanaForm(map[string]any{"password": strings.Repeat("p", 1025)})))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"passwordSet":false`) || !strings.Contains(w.Body.String(), "Password change could not be confirmed") {
		t.Fatalf("save: %d %s", w.Code, w.Body.String())
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE id = $1 AND revoked_at IS NULL`, live); n != 1 {
		t.Error("the session must stay")
	}
	if n := count(t, e, `SELECT revision::int FROM players WHERE id = $1`, hana); n != 4 {
		t.Errorf("revision %d, want 4", n)
	}
	if n := count(t, e, `SELECT count(*) FROM admin_audit_events`); n != 0 {
		t.Errorf("%d events", n)
	}
}

// An email an Admin sets is the one the player signs in with: the contact and the login key change together, the old
// email no longer finds the identity, the new one does, and the sessions stay (an email change is not a reason to sign
// anyone out). A key another sign-in already has changes neither and leaves the change failed.
func TestAdminEmailMovesTheLoginWithTheContact(t *testing.T) {
	e, reset := playersEnv(t)
	live := playerSession(t, e, hanaSub, hana)
	w := patchPlayer(t, e, hana, editBody(t, "4", hanaForm(map[string]any{"email": "  Hana.NEW@Example.test "})))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"changed":["email"]`) || !strings.Contains(w.Body.String(), `"warnings":[]`) {
		t.Fatalf("save: %d %s", w.Code, w.Body.String())
	}
	if _, err := e.Store.GetIdentityByLogin(e.Ctx, store.AudiencePlayer, "hana.new@example.test"); err != nil {
		t.Errorf("the new email must find the identity: %v", err)
	}
	if _, err := e.Store.GetIdentityByLogin(e.Ctx, store.AudiencePlayer, "hana@example.test"); err == nil {
		t.Error("the old email must not find an identity")
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE id = $1 AND revoked_at IS NULL`, live); n != 1 {
		t.Error("the session must stay")
	}
	var email string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT email FROM player_private_contacts WHERE player_id = $1`, hana).Scan(&email); err != nil || email != "hana.new@example.test" {
		t.Errorf("contact email %q %v", email, err)
	}

	reset()
	w = patchPlayer(t, e, hana, editBody(t, "4", hanaForm(map[string]any{"email": "taken@example.test"})))
	if w.Code != 200 || !strings.Contains(w.Body.String(), "Email change could not be confirmed") {
		t.Fatalf("taken: %d %s", w.Code, w.Body.String())
	}
	if _, err := e.Store.GetIdentityByLogin(e.Ctx, store.AudiencePlayer, "hana@example.test"); err != nil {
		t.Errorf("the identity keeps its key: %v", err)
	}
	if n := count(t, e, `SELECT count(*) FROM player_private_contacts WHERE player_id = $1 AND email = 'hana@example.test'`, hana); n != 1 {
		t.Error("the contact keeps its email")
	}
	if n := count(t, e, `SELECT count(*) FROM admin_player_email_edits WHERE state = 'failed'`); n != 1 {
		t.Errorf("%d failed email edits", n)
	}
}

// A login that diverged (its key is neither the email the change started from nor the new one) is left staged: the
// contact is not touched, the account stays applying, and the answer is a warning, not a success.
func TestADivergedLoginIsLeftStaged(t *testing.T) {
	e, _ := playersEnv(t)
	e.Exec(t, `UPDATE auth_identities SET login_key = 'someone.else@example.test' WHERE id = $1`, uuid.MustParse(hanaSub))
	w := patchPlayer(t, e, hana, editBody(t, "4", hanaForm(map[string]any{"email": "hana.new@example.test"})))
	if w.Code != 200 || !strings.Contains(w.Body.String(), "Email change could not be confirmed") {
		t.Fatalf("save: %d %s", w.Code, w.Body.String())
	}
	var status, email string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT a.contact_sync_status, c.email FROM player_accounts a JOIN player_private_contacts c USING (player_id) WHERE a.player_id = $1`, hana).Scan(&status, &email); err != nil {
		t.Fatal(err)
	}
	if status != "applying" || email != "hana@example.test" {
		t.Errorf("status %q, email %q", status, email)
	}
	if n := count(t, e, `SELECT count(*) FROM admin_player_email_edits WHERE state = 'pending'`); n != 1 {
		t.Errorf("%d pending email edits", n)
	}
}

// Two saves of the same revision at the same moment: one wins and the other is a conflict, whoever is first. What always
// holds: the revision went up once, the profile is one of the two names, and one event was written.
func TestRaceOfTwoProfileSavesOfOneRevision(t *testing.T) {
	e, reset := playersEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		got := sendAllTo(t, e, "PATCH", "/api/players/"+hana,
			editBody(t, "4", hanaForm(map[string]any{"name": "Hana A."})), editBody(t, "4", hanaForm(map[string]any{"name": "Hana B."})))
		ok, conflict := 0, 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
				conflict++
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok != 1 || conflict != 1 {
			t.Fatalf("round %d: %d wins, %d conflicts", round, ok, conflict)
		}
		if n := count(t, e, `SELECT revision::int FROM players WHERE id = $1`, hana); n != 5 {
			t.Fatalf("round %d: revision %d", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.profile_updated'`); n != 1 {
			t.Fatalf("round %d: %d events", round, n)
		}
	}
}

// Two RTR ID changes of one player to the same place at the same moment: one wins, the other is a conflict (the RTR ID is
// held now, or the player changed since the form was loaded: which of the two messages depends on timing). One record
// holds the new RTR ID everywhere and the old string is gone.
func TestRaceOfTwoRtrIDChanges(t *testing.T) {
	e, reset := playersEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		body := editBody(t, "4", hanaForm(map[string]any{"registrationPlace": "PH-MNL"}))
		got := sendAllTo(t, e, "PATCH", "/api/players/"+hana, body, body)
		ok := 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok != 1 {
			t.Fatalf("round %d: %d wins", round, ok)
		}
		if n := count(t, e, `SELECT count(*) FROM player_id_allocations WHERE rtr_id = 'RTR-PH-MNL-102926-0014'`); n != 1 {
			t.Fatalf("round %d: new RTR ID held %d times", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM player_id_allocations WHERE rtr_id = 'RTR-PH-CEB-102926-0014'`) + count(t, e, `SELECT count(*) FROM shared_player_entries WHERE rtr_id = 'RTR-PH-CEB-102926-0014'`); n != 0 {
			t.Fatalf("round %d: the old RTR ID is held %d times", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.profile_updated'`); n != 1 {
			t.Fatalf("round %d: %d events", round, n)
		}
	}
}

// Two email changes of one player to different addresses at the same moment: whichever staged first, the contact and the
// login key never disagree, the contact has one of the two addresses (or the old one), and at most one change is applied.
func TestRaceOfTwoEmailChanges(t *testing.T) {
	e, reset := playersEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		got := sendAllTo(t, e, "PATCH", "/api/players/"+hana,
			editBody(t, "4", hanaForm(map[string]any{"email": "hana.a@example.test"})), editBody(t, "4", hanaForm(map[string]any{"email": "hana.b@example.test"})))
		for _, w := range got {
			if w.Code != 200 && w.Code != 409 {
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		var contact, login string
		if err := e.Pool.QueryRow(e.Ctx, `SELECT c.email, i.login_key FROM player_private_contacts c JOIN player_accounts a ON a.player_id = c.player_id JOIN auth_identities i ON i.id = a.auth_subject WHERE c.player_id = $1`, hana).Scan(&contact, &login); err != nil {
			t.Fatal(err)
		}
		if contact != login {
			t.Fatalf("round %d: contact %q, login %q", round, contact, login)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_player_email_edits WHERE state = 'applied'`); n > 1 {
			t.Fatalf("round %d: %d applied edits", round, n)
		}
	}
}

// Two email changes of an unclaimed person's entry at once: one wins, the other is a conflict, and the entry has one of
// the two addresses with its revision raised twice (the email write and the plain bump the TypeScript does after it).
func TestRaceOfTwoEntryEmailChanges(t *testing.T) {
	e, reset := playersEnv(t)
	form := func(email string) string {
		return editBody(t, "1", map[string]any{
			"picture": nil, "name": "Una Alonzo", "nickname": "Uni", "playingStyle": "", "experienceYears": "", "experienceMonths": "",
			"facebook": "", "instagram": "", "youtube": "", "linkedin": "", "profilePrivate": false, "phoneHidden": false,
			"phone": "+639175550911", "email": email, "password": "", "reason": "r", "registrationPlace": "PH-CEB", "registrationDate": "2026-10-29",
		})
	}
	for round := 0; round < 10; round++ {
		reset()
		got := sendAllTo(t, e, "PATCH", "/api/players/"+entryUna, form("una.a@example.test"), form("una.b@example.test"))
		ok, conflict := 0, 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
				conflict++
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok != 1 || conflict != 1 {
			t.Fatalf("round %d: %d wins, %d conflicts", round, ok, conflict)
		}
		if n := count(t, e, `SELECT revision::int FROM shared_player_entries WHERE id = $1`, entryUna); n != 3 {
			t.Fatalf("round %d: revision %d", round, n)
		}
	}
}

// An edit and a verification override read the same revision at the same moment: whoever locks the player first wins, the
// other is refused with the revision it read gone, and the revision went up once.
func TestRaceOfAnEditAndAVerification(t *testing.T) {
	e, reset := playersEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		got := e.DoAll([]writetest.Request{
			{Method: "PATCH", Path: "/api/players/" + hana, App: "admin", Bearer: e.AdminPass(t, owner), Body: editBody(t, "4", hanaForm(map[string]any{"name": "Hana A."}))},
			{Method: "PATCH", Path: "/api/players/" + hana + "/verification", App: "admin", Bearer: e.AdminPass(t, owner), Body: `{"revision":"4","verifiedByAdmin":true,"reason":"r"}`},
		})
		ok := 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok != 1 {
			t.Fatalf("round %d: %d wins", round, ok)
		}
		if n := count(t, e, `SELECT revision::int FROM players WHERE id = $1`, hana); n != 5 {
			t.Fatalf("round %d: revision %d", round, n)
		}
	}
}

// Two Add player requests of one number at once. The Route Handler takes no lock between its check and its insert, and
// neither does Go: both can save the record, or the second finds the first. What always holds: only 200 and 409, at
// least one 200, and every record has its intake and its event.
func TestRaceOfTwoAddPlayersOfOneNumber(t *testing.T) {
	e, reset := playersEnv(t)
	body := `{"name":"Nina Park","nickname":"","phone":"0917 555 0199","email":"","place":"CEB","clubId":"` + smash + `","allowDuplicate":false}`
	for round := 0; round < 10; round++ {
		reset()
		got := sendAllTo(t, e, "POST", "/api/players", body, body, body)
		ok := 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok == 0 {
			t.Fatalf("round %d: nobody saved the player", round)
		}
		records := count(t, e, `SELECT count(*) FROM club_players WHERE display_name = 'Nina Park'`)
		if records != ok || count(t, e, `SELECT count(*) FROM club_player_private_inputs WHERE phone_e164 = '+639175550199'`) != records ||
			count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.created'`) != records {
			t.Fatalf("round %d: %d records for %d answers", round, records, ok)
		}
	}
}

// sendAllTo sends the same request, signed in as the owner, once per body, all at the same moment.
func sendAllTo(t *testing.T, e *writetest.Env, method, path string, bodies ...string) []*httptest.ResponseRecorder {
	t.Helper()
	return sendAll(t, e, owner, method, path, bodies...)
}

// Where Add player's two lookups have no order in the TypeScript, Go's is fixed: when one contact has the phone and
// another has the email the phone is named; when two records of the club have the number, the oldest is named.
func TestAddPlayerNamesThePhoneFirstAndTheOldestRecord(t *testing.T) {
	e, _ := playersEnv(t)
	post := func(body string) *httptest.ResponseRecorder {
		return e.Do(writetest.Request{Method: "POST", Path: "/api/players", App: "admin", Bearer: e.AdminPass(t, owner), Body: body})
	}
	w := post(`{"name":"N","nickname":"","phone":"+639175550002","email":"alice@example.test","place":"CEB","clubId":"` + smash + `","allowDuplicate":false}`)
	if w.Code != 409 || !strings.Contains(w.Body.String(), `"phone":"This phone number is already linked to another player."`) {
		t.Errorf("phone and email on two contacts: %d %s", w.Code, w.Body.String())
	}
	// A second record of the club with the number of Cory Only (added later): the older one is named.
	e.Exec(t, `INSERT INTO club_players (id, club_id, display_name, added_at, created_at, updated_at) VALUES ('c6000000-0000-4000-8000-000000000099', $1, 'Later Lee', TIMESTAMPTZ '2026-11-10 00:00:00+00', now(), now())`, smash)
	e.Exec(t, `INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, captured_at, created_at, updated_at) VALUES ('c6000000-0000-4000-8000-000000000099', $1, '+639175550921', now(), now(), now())`, smash)
	w = post(`{"name":"N","nickname":"","phone":"0917 555 0921","email":"","place":"CEB","clubId":"` + smash + `","allowDuplicate":false}`)
	if w.Code != 409 || !strings.Contains(w.Body.String(), "Cory Only already has this number in this club.") {
		t.Errorf("two records with the number: %d %s", w.Code, w.Body.String())
	}
}

// The photo checks run before the store is reached: an unreadable photo is `invalid`, a readable one is `unavailable`
// here because Go has no storage client (the pictures track), and neither writes anything.
func TestAPhotoUploadIsCheckedAndNotStored(t *testing.T) {
	e, _ := playersEnv(t)
	for _, c := range []struct {
		picture string
		status  int
	}{
		{"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADA", 503},
		{"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAAAAAAAAAAAAAAAAAAAAAA=", 503},
		{"data:image/png;base64,iVBORw0KGgo=", 422},
		{"data:image/gif;base64,R0lGODlhAQABAAAAACw=", 422},
	} {
		w := patchPlayer(t, e, hana, editBody(t, "4", hanaForm(map[string]any{"picture": c.picture})))
		if w.Code != c.status {
			t.Errorf("%.30s: %d %s", c.picture, w.Code, w.Body.String())
		}
		if n := count(t, e, `SELECT revision::int FROM players WHERE id = $1`, hana); n != 4 {
			t.Errorf("%.30s: revision %d", c.picture, n)
		}
	}
}
