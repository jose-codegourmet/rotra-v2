package adminwrites_test

import (
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// What the golden file of the password-reset review (resetreview.golden.json) cannot pin, because Go and the Route Handler differ
// on purpose (go-sign-in's Review, the recovery service this route calls) or the capture cannot reach it:
//
//	the provider fails        password-resets.ts:149-157: the TypeScript clears its lease and answers 503 `unavailable` with
//	                          "Couldn't generate a reset link. Check the account and try again." when Supabase cannot make the
//	                          link; Go makes the token itself, so it cannot fail that way. Pinned here from the source only.
//	the account changed       password-resets.ts:162-166: between the lease and the save the TypeScript refuses an account that
//	                          changed (`conflict` on `account`); Go does it all in one transaction, so there is no gap.
//	the lease                 password-resets.ts:117-125: a second issue within 60 seconds of one that holds the lease is a
//	                          `conflict` on `link`; Go has no lease (TestIssueIsNotRefusedByALease).

func resetsEnv(t *testing.T) (*writetest.Env, func(statements ...string)) {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "resetreview.cases.json", &cf)
	e := writetest.NewEnv(t, cf.Now, build)
	seed := writetest.ReadSeed(t, "testdata", cf.Seed)
	reset := func(statements ...string) { e.Reseed(t, seed, statements) }
	reset()
	return e, reset
}

func review(t *testing.T, e *writetest.Env, id, body string) (int, string) {
	t.Helper()
	w := e.Do(writetest.Request{Method: "POST", Path: "/api/password-reset-requests/" + id, App: "admin", Bearer: e.AdminPass(t, owner), Body: body})
	return w.Code, w.Body.String()
}

const (
	resetAlice  = "b3000000-0000-4000-8000-000000000101"
	issueAction = `{"action":"issue","ownershipVerified":true}`
)

// The TypeScript refuses a second issue while the first holds its 60 second lease; Go issues one step at a time, so a stale
// lease column changes nothing and the link is made.
func TestIssueIsNotRefusedByALease(t *testing.T) {
	e, reset := resetsEnv(t)
	reset(`UPDATE player_password_reset_requests SET issuance_id = gen_random_uuid(), issuance_started_at = TIMESTAMPTZ '2026-11-19 03:59:30+00' WHERE id = '` + resetAlice + `'`)
	code, body := review(t, e, resetAlice, issueAction)
	if code != 200 || !strings.Contains(body, `"token":"`) {
		t.Fatalf("%d %s", code, body)
	}
	if n := count(t, e, `SELECT count(*) FROM player_password_reset_requests WHERE id = $1 AND issuance_id IS NULL AND issuance_started_at IS NULL AND token_digest IS NOT NULL`, resetAlice); n != 1 {
		t.Error("the lease must be cleared by the issue")
	}
}

// Go adds one condition to an eligible account: the sign-in identity it points at must exist (a link for an account that cannot
// sign in is of no use). The TypeScript has no identity to check.
func TestIssueNeedsASignInIdentity(t *testing.T) {
	e, reset := resetsEnv(t)
	reset(`DELETE FROM auth_identities WHERE id = 'f4000000-0000-4000-8000-000000000001'`)
	code, body := review(t, e, resetAlice, issueAction)
	if code != 409 || !strings.Contains(body, `"account"`) {
		t.Fatalf("%d %s", code, body)
	}
}

// The audit event names the request by its ID in the canonical lower case. The TypeScript records the ID as the Admin typed it,
// so an upper case ID would be an upper case target there; Go's Review (go-sign-in) parses it first.
func TestAnUpperCaseIDIsAuditedInLowerCase(t *testing.T) {
	e, _ := resetsEnv(t)
	code, body := review(t, e, strings.ToUpper(resetAlice), `{"action":"decline"}`)
	if code != 200 || !strings.Contains(body, `"token":null`) {
		t.Fatalf("%d %s", code, body)
	}
	if got := text(t, e, `SELECT target_id FROM admin_audit_events WHERE action = 'player.password_reset_declined'`); got != resetAlice {
		t.Errorf("target %q", got)
	}
}

// An issue and a decline of one request at once, and two issues at once: the request ends in one state, with one event for
// the decision that won, and the second issue replaces the first link (the later one works).
func TestRaceOfIssueAndDecline(t *testing.T) {
	e, reset := resetsEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		got := sendAllTo(t, e, "POST", "/api/password-reset-requests/"+resetAlice, issueAction, `{"action":"decline"}`)
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
		issued := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.password_reset_link_issued'`)
		declined := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.password_reset_declined'`)
		status := text(t, e, `SELECT status FROM player_password_reset_requests WHERE id = $1`, resetAlice)
		// An issue then a decline refuses the decline (an issued request is not pending); a decline then an issue refuses the issue.
		if ok != 1 || issued+declined != 1 || (status == "issued") != (issued == 1) {
			t.Fatalf("round %d: %d answers ok, %d issued, %d declined, status %s", round, ok, issued, declined, status)
		}
	}
}

func TestRaceOfTwoIssues(t *testing.T) {
	e, reset := resetsEnv(t)
	for round := 0; round < 10; round++ {
		reset()
		got := sendAllTo(t, e, "POST", "/api/password-reset-requests/"+resetAlice, issueAction, issueAction)
		tokens := map[string]bool{}
		for _, w := range got {
			if w.Code != 200 {
				t.Fatalf("round %d: %d %s", round, w.Code, w.Body.String())
			}
			tokens[w.Body.String()] = true
		}
		if len(tokens) != 2 {
			t.Fatalf("round %d: two issues must make two links", round)
		}
		if n := count(t, e, `SELECT count(*) FROM player_password_reset_requests WHERE player_id = 'd4000000-0000-4000-8000-000000000001' AND token_digest IS NOT NULL`); n != 1 {
			t.Fatalf("round %d: %d live links for one player", round, n)
		}
	}
}

// The revisions of an issue, where the TypeScript and Go differ (the plan's deviations log; the golden cases redact `revision`
// of this table for the issue cases, so it is pinned here). The TypeScript revokes with an update of EVERY request of the player
// (revision + 1 and a new updated_at each), then issues (+ 1 again): Hana's pending 104 ends at 3 and her issued 105 at 3, and
// Alice's lone 101 at 3. Go revokes only the requests that hold a link and issues once: 104 stays at 1 (no link to revoke),
// 105 is 3 (revoked, then issued) and 101 is 2.
func TestRevisionsOfAnIssue(t *testing.T) {
	e, reset := resetsEnv(t)
	const resetHana104, resetHana105 = "b3000000-0000-4000-8000-000000000104", "b3000000-0000-4000-8000-000000000105"
	if code, body := review(t, e, resetHana105, issueAction); code != 200 {
		t.Fatalf("%d %s", code, body)
	}
	for id, want := range map[string]int{resetHana104: 1, resetHana105: 3} {
		if got := count(t, e, `SELECT revision::int FROM player_password_reset_requests WHERE id = $1`, id); got != want {
			t.Errorf("revision of %s: %d, want %d", id, got, want)
		}
	}
	reset()
	if code, body := review(t, e, resetAlice, issueAction); code != 200 {
		t.Fatalf("%d %s", code, body)
	}
	if got := count(t, e, `SELECT revision::int FROM player_password_reset_requests WHERE id = $1`, resetAlice); got != 2 {
		t.Errorf("revision of Alice's request: %d, want 2", got)
	}
}
