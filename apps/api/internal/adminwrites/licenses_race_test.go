package adminwrites_test

import (
	"fmt"
	"testing"
)

const (
	freshStart    = "d1000000-0000-4000-8000-000000000004"
	noEntitlement = "d1000000-0000-4000-8000-000000000005"
)

func licenseBody(command string) string {
	return fmt.Sprintf(`{"sourceCommandId":%q,"plan":"Monthly","amountMinor":180000,"paidOn":"2026-11-19","reference":"r"}`, command)
}

// Two clubs activated at the same moment. The payment reference is the count of every term plus one, taken under the
// lock of one club only, so two clubs can both read the same count and the second insert fails on the unique reference.
// The Route Handler has the same race and answers that failure as an unexpected error (a 500); it is ported as it is
// (see the deviations log). Which of the two loses, or whether both succeed, depends on timing, so the golden file does
// not pin it. What always holds: no answer but 201 or 500, one winner at least, every 201 is a term, a failed request
// wrote nothing, and the references are unique.
func TestRaceOfTwoClubsTakingTheSameReference(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		got := make([]int, 0, 2)
		for _, w := range sendBoth(t, e,
			"/api/clubs/"+freshStart+"/licenses", licenseBody("c2000000-0000-4000-8000-000000000302"),
			"/api/clubs/"+noEntitlement+"/licenses", licenseBody("c2000000-0000-4000-8000-000000000303")) {
			got = append(got, w.Code)
		}
		wins := 0
		for _, code := range got {
			switch code {
			case 201:
				wins++
			case 500:
			default:
				t.Fatalf("round %d: status %d", round, code)
			}
		}
		if wins == 0 {
			t.Fatalf("round %d: nobody won: %v", round, got)
		}
		if n := count(t, e, `SELECT count(*) FROM club_license_terms WHERE source_command_id IN ('c2000000-0000-4000-8000-000000000302','c2000000-0000-4000-8000-000000000303')`); n != wins {
			t.Fatalf("round %d: %d terms for %d winners (%v)", round, n, wins, got)
		}
		if n := count(t, e, `SELECT count(DISTINCT payment_reference) - count(*) FROM club_license_terms`); n != 0 {
			t.Fatalf("round %d: a reference repeats", round)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action LIKE 'club.license_%'`); n != wins {
			t.Fatalf("round %d: %d audit events for %d winners", round, n, wins)
		}
	}
}

// One command used for two clubs at once: the club locks do not meet, so both pass the lookup and one insert fails
// on the unique command. Whatever the timing, at most one term carries the command.
func TestRaceOfOneCommandOnTwoClubs(t *testing.T) {
	e, reset := clubsEnv(t)
	const command = "c2000000-0000-4000-8000-000000000310"
	for round := 0; round < 12; round++ {
		reset()
		got := sendBoth(t, e, "/api/clubs/"+freshStart+"/licenses", licenseBody(command), "/api/clubs/"+noEntitlement+"/licenses", licenseBody(command))
		wins := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				wins++
			case 409, 500:
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if wins == 0 {
			t.Fatalf("round %d: nobody won", round)
		}
		if n := count(t, e, `SELECT count(*) FROM club_license_terms WHERE source_command_id = $1`, command); n != 1 {
			t.Fatalf("round %d: %d terms carry the command", round, n)
		}
	}
}
