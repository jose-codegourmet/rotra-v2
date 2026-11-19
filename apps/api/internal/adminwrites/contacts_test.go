package adminwrites_test

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// What the golden files of the contact-change writes cannot pin: the writes that race, the one answer of the application
// that differs from the TypeScript on purpose (a phone is read back without a provider), and a failure the capture cannot make.

const (
	rq1  = "b1000000-0000-4000-8000-000000000001" // Alice's phone change, pending
	rq4  = "b1000000-0000-4000-8000-000000000004" // Carla's email change, pending
	rq5  = "b1000000-0000-4000-8000-000000000005" // Carla's newer email change, pending
	rq12 = "b1000000-0000-4000-8000-000000000012" // Dan's email change (a scenario), Dan is unclaimed
	dan  = "d4000000-0000-4000-8000-000000000004"
)

// contactsEnv is a test environment on testdata/contacts.seed.sql; reset puts it back, with the named scenario of
// contactdecide.cases.json on top.
func contactsEnv(t *testing.T) (*writetest.Env, func(scenario string)) {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "contactdecide.cases.json", &cf)
	e := writetest.NewEnv(t, cf.Now, build)
	seed := writetest.ReadSeed(t, "testdata", cf.Seed)
	reset := func(scenario string) {
		stmts, ok := cf.Scenarios[scenario]
		if !ok {
			t.Fatalf("no scenario %q", scenario)
		}
		e.Reseed(t, seed, stmts)
	}
	reset("base")
	return e, reset
}

func decide(t *testing.T, e *writetest.Env, verb, id string) *httptest.ResponseRecorder {
	t.Helper()
	return e.Do(writetest.Request{Method: "POST", Path: "/api/contact-change-requests/" + id + "/" + verb, App: "admin", Bearer: e.AdminPass(t, owner)})
}

func requestStatus(t *testing.T, w *httptest.ResponseRecorder) (status, failure string) {
	t.Helper()
	var out struct {
		Request struct {
			Status      string  `json:"status"`
			FailureCode *string `json:"failureCode"`
		} `json:"request"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("%s: %v", w.Body.String(), err)
	}
	if out.Request.FailureCode != nil {
		failure = *out.Request.FailureCode
	}
	return out.Request.Status, failure
}

func text(t *testing.T, e *writetest.Env, sql string, args ...any) (s string) {
	t.Helper()
	if err := e.Pool.QueryRow(e.Ctx, sql, args...).Scan(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

// A phone is no part of a sign-in identity, so Go has nothing to read back: a check of an approved phone change applies it,
// where the provider of the TypeScript, never told the number, answers provider_not_applied (the golden cases never read back a
// phone that was not set first). An email is read back for real: the login key not yet changed is "not applied".
func TestCheckOfAnApprovedPhoneChangeAppliesIt(t *testing.T) {
	e, reset := contactsEnv(t)
	reset("alice_phone_approved")
	w := decide(t, e, "check", rq1)
	if status, _ := requestStatus(t, w); w.Code != 200 || status != "applied" {
		t.Fatalf("check: %d %s", w.Code, w.Body.String())
	}
	if got := text(t, e, `SELECT phone_e164 FROM player_private_contacts WHERE player_id = $1`, alice); got != "+639175550999" {
		t.Errorf("the contact must have the number: %q", got)
	}
	reset("alice_email_approved")
	if status, failure := requestStatus(t, decide(t, e, "check", "b1000000-0000-4000-8000-000000000011")); status != "failed" || failure != "provider_not_applied" {
		t.Errorf("an email whose login was not changed: %s %s", status, failure)
	}
}

// An email change moves the login key of the player's identity and the contact, and the identity signs in with the new one.
func TestApprovedEmailChangeMovesTheLogin(t *testing.T) {
	e, reset := contactsEnv(t)
	reset("alice_email_pending")
	w := decide(t, e, "approve", "b1000000-0000-4000-8000-000000000011")
	if status, _ := requestStatus(t, w); w.Code != 200 || status != "applied" {
		t.Fatalf("approve: %d %s", w.Code, w.Body.String())
	}
	if got := text(t, e, `SELECT login_key FROM auth_identities WHERE id = 'f4000000-0000-4000-8000-000000000001'`); got != "alice.new@example.test" {
		t.Errorf("login key %q", got)
	}
	if got := text(t, e, `SELECT email FROM player_private_contacts WHERE player_id = $1`, alice); got != "alice.new@example.test" {
		t.Errorf("contact email %q", got)
	}
	ident, err := e.Store.GetIdentityByLogin(e.Ctx, "player", "alice.new@example.test")
	if err != nil || ident.ID.String() != "f4000000-0000-4000-8000-000000000001" {
		t.Errorf("the new email must find the identity: %v %v", ident.ID, err)
	}
	if n := count(t, e, `SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL AND audience = 'player'`); n != 0 {
		t.Errorf("a contact change ends no session, as in the TypeScript: %d", n)
	}
}

// A failure that is not the provider's still ends as failed (application_error), so the approval is never hidden behind an
// error: Dan (unclaimed, so no account trigger gets in the way) has no contact row at the moment the change is applied.
func TestAnApplicationThatCannotWriteTheContactEndsAsFailed(t *testing.T) {
	e, reset := contactsEnv(t)
	reset("dan_email_approved")
	e.Setup(t, []string{`DELETE FROM player_private_contacts WHERE player_id = '` + dan + `'`})
	w := decide(t, e, "approve", rq12)
	if status, failure := requestStatus(t, w); w.Code != 200 || status != "failed" || failure != "application_error" {
		t.Fatalf("approve: %d %s", w.Code, w.Body.String())
	}
	if n := count(t, e, `SELECT application_attempts FROM player_contact_change_requests WHERE id = $1`, rq12); n != 1 {
		t.Errorf("attempts %d", n)
	}
	if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.contact_change_applied'`); n != 0 {
		t.Errorf("an event for a change that was not applied: %d", n)
	}
}

// Two approvals of one request at once (a double click, two Admins): one approval event, one application, one notification,
// and both answer the request as it stands. Which answer says applying or applied is not decided.
func TestRaceOfTwoApprovalsOfOneRequest(t *testing.T) {
	e, reset := contactsEnv(t)
	for round := 0; round < 10; round++ {
		reset("base")
		got := sendAllTo(t, e, "POST", "/api/contact-change-requests/"+rq1+"/approve", "", "")
		for _, w := range got {
			if status, _ := requestStatus(t, w); w.Code != 200 || (status != "applied" && status != "applying") {
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if got := text(t, e, `SELECT status FROM player_contact_change_requests WHERE id = $1`, rq1); got != "applied" {
			t.Fatalf("round %d: status %s", round, got)
		}
		for action, want := range map[string]int{"player.contact_change_approved": 1, "player.contact_change_applied": 1} {
			if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = $1`, action); n != want {
				t.Fatalf("round %d: %d %s events, want %d", round, n, action, want)
			}
		}
		if n := count(t, e, `SELECT count(*) FROM player_notifications WHERE source_type = 'contact_change_request' AND player_id = $1`, alice); n != 1 {
			t.Fatalf("round %d: %d notifications", round, n)
		}
		if got := text(t, e, `SELECT phone_e164 FROM player_private_contacts WHERE player_id = $1`, alice); got != "+639175550999" {
			t.Fatalf("round %d: phone %s", round, got)
		}
	}
}

// An approval and a decline at once: the request is decided once. The loser is a conflict ("already decided"), or answers the
// request as it stands when it asks for what the winner did.
func TestRaceOfAnApprovalAndADecline(t *testing.T) {
	e, reset := contactsEnv(t)
	for round := 0; round < 10; round++ {
		reset("base")
		got := e.DoAll([]writetest.Request{
			{Method: "POST", Path: "/api/contact-change-requests/" + rq1 + "/approve", App: "admin", Bearer: e.AdminPass(t, owner)},
			{Method: "POST", Path: "/api/contact-change-requests/" + rq1 + "/decline", App: "admin", Bearer: e.AdminPass(t, secondUser)},
		})
		for _, w := range got {
			if w.Code != 200 && w.Code != 409 {
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		approved := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.contact_change_approved'`)
		rejected := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.contact_change_rejected'`)
		if approved+rejected != 1 {
			t.Fatalf("round %d: %d approvals and %d declines recorded", round, approved, rejected)
		}
		status := text(t, e, `SELECT status FROM player_contact_change_requests WHERE id = $1`, rq1)
		if (rejected == 1) != (status == "rejected") {
			t.Fatalf("round %d: status %s with %d declines", round, status, rejected)
		}
		if rejected == 1 && text(t, e, `SELECT phone_e164 FROM player_private_contacts WHERE player_id = $1`, alice) != "+639175550001" {
			t.Fatalf("round %d: a declined change moved the contact", round)
		}
	}
}

// Two approvals of two requests of one player at once: the unique index of one change in flight per player lets only one be
// approved while the other is in flight, and the loser gets the "already open" conflict, or is refused because the player's
// contacts changed since it was made. One timing lets both through, as in the TypeScript: the second review reads the contact
// revision before the first application commits (the settle takes the request's lock, not the player's), and approves after
// the first is applied and no longer in flight. Then both are applied in turn and the later email wins. Ported as is (plan,
// deviations log: owner decision to take the player's lock in the settle); what always holds is checked.
func TestRaceOfTwoApprovalsForOnePlayer(t *testing.T) {
	e, reset := contactsEnv(t)
	for round := 0; round < 10; round++ {
		reset("carla_has_her_email")
		got := e.DoAll([]writetest.Request{
			{Method: "POST", Path: "/api/contact-change-requests/" + rq4 + "/approve", App: "admin", Bearer: e.AdminPass(t, owner)},
			{Method: "POST", Path: "/api/contact-change-requests/" + rq5 + "/approve", App: "admin", Bearer: e.AdminPass(t, owner)},
		})
		ok := 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
				if !strings.Contains(w.Body.String(), "A contact change is already open.") && !strings.Contains(w.Body.String(), "contacts changed since this request") {
					t.Fatalf("round %d: %s", round, w.Body.String())
				}
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok == 0 {
			t.Fatalf("round %d: nobody was approved", round)
		}
		const carla = `'d4000000-0000-4000-8000-000000000003'`
		if n := count(t, e, `SELECT count(*) FROM player_contact_change_requests WHERE player_id = `+carla+` AND status IN ('approved','applying','failed')`); n > 1 {
			t.Fatalf("round %d: %d changes in flight", round, n)
		}
		applied := count(t, e, `SELECT count(*) FROM player_contact_change_requests WHERE player_id = `+carla+` AND status = 'applied' AND field = 'email'`)
		if events := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.contact_change_applied'`); applied < 1 || applied > 2 || events != applied {
			t.Fatalf("round %d: %d applied, %d events", round, applied, events)
		}
	}
}

// Two creates of one command at once: one request and one audit event; the other answer is the same request again, or the
// "already open" conflict of the unique command (which of the two is timing, in the TypeScript too).
func TestRaceOfTheSameCreateCommand(t *testing.T) {
	e, reset := contactsEnv(t)
	body := `{"commandId":"c0000000-0000-4000-8000-000000000001","playerId":"d4000000-0000-4000-8000-000000000008","field":"email","value":"hana.new@example.test","reason":"Asked at the desk"}`
	for round := 0; round < 12; round++ {
		reset("base")
		got := sendAllTo(t, e, "POST", "/api/contact-change-requests", body, body, body)
		created := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				created++
			case 409:
				if !strings.Contains(w.Body.String(), "A contact change is already open.") {
					t.Fatalf("round %d: %s", round, w.Body.String())
				}
			default:
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
		}
		if created == 0 {
			t.Fatalf("round %d: nobody created the request", round)
		}
		if n := count(t, e, `SELECT count(*) FROM player_contact_change_requests WHERE source_command_id = 'c0000000-0000-4000-8000-000000000001'`); n != 1 {
			t.Fatalf("round %d: %d requests", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE source_command_id = 'c0000000-0000-4000-8000-000000000001'`); n != 1 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// The notification of a decision is the player's, once, and carries no contact value; a player with no account has none.
func TestNotificationsOfADecision(t *testing.T) {
	e, reset := contactsEnv(t)
	reset("base")
	decide(t, e, "decline", rq1)
	var title, body, target string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT title, body, target FROM player_notifications WHERE player_id = $1 AND source_type = 'contact_change_request'`, alice).Scan(&title, &body, &target); err != nil {
		t.Fatal(err)
	}
	if title != "Your phone number change was declined" || body != "ROTRA Admin declined the change." || target != "/profile/privacy-and-contact" {
		t.Errorf("notification: %q %q %q", title, body, target)
	}
	decide(t, e, "decline", rq1) // repeat-safe: nothing more
	if n := count(t, e, `SELECT count(*) FROM player_notifications WHERE source_type = 'contact_change_request'`); n != 1 {
		t.Errorf("%d notifications", n)
	}
	reset("dan_email_pending")
	decide(t, e, "decline", rq12)
	if n := count(t, e, `SELECT count(*) FROM player_notifications WHERE source_type = 'contact_change_request'`); n != 0 {
		t.Errorf("an unclaimed player has no inbox: %d", n)
	}
}
