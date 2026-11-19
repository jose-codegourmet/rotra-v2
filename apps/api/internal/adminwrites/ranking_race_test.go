package adminwrites_test

import (
	"fmt"
	"strings"
	"testing"
)

func saveBody(command string, expected int) string {
	return fmt.Sprintf(`{"commandId":%q,"expectedVersion":%d,"assessmentWeightBp":7000,"performanceWeightBp":3000,"recentStandardMatchThreshold":10,"changeNote":"x"}`, command, expected)
}

// Saves that run at once. Whether the second of two saves of one command finds the first's audit event (the same
// version again) or loses the version check (a conflict) depends on timing in the Route Handler too, so the golden
// file does not pin it. What always holds is checked here, many times over: one new version, one audit event.
func TestRaceOfTheSameCommand(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		const command = "c2000000-0000-4000-8000-000000000190"
		got := sendAll(t, e, owner, "POST", "/api/ranking-settings", saveBody(command, 2), saveBody(command, 2), saveBody(command, 2))
		created := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				created++
				if !strings.Contains(w.Body.String(), `"version":3`) {
					t.Fatalf("round %d: %s", round, w.Body.String())
				}
			case 409:
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if created == 0 {
			t.Fatalf("round %d: nobody saved the version", round)
		}
		if n := count(t, e, `SELECT count(*) FROM ranking_policy_versions`); n != 3 {
			t.Fatalf("round %d: %d versions, want 3", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'ranking.policy_saved'`); n != 1 {
			t.Fatalf("round %d: %d audit events, want 1", round, n)
		}
	}
}

// Several owners save on top of the same version: exactly one wins, the rest are conflicts, and the versions stay
// 1, 2, 3 with no gap and no repeat.
func TestRaceOfSavesOnTheSameVersion(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 8; round++ {
		reset()
		var bodies []string
		for i := 0; i < 6; i++ {
			bodies = append(bodies, saveBody(fmt.Sprintf("c2000000-0000-4000-8000-0000000002%02d", i), 2))
		}
		got := sendAll(t, e, owner, "POST", "/api/ranking-settings", bodies...)
		won := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				won++
			case 409:
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if won != 1 {
			t.Fatalf("round %d: %d winners, want 1", round, won)
		}
		if n := count(t, e, `SELECT count(*) FROM ranking_policy_versions WHERE version = 3`); n != 1 {
			t.Fatalf("round %d: %d versions numbered 3", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM ranking_policy_versions`); n != 3 {
			t.Fatalf("round %d: %d versions, want 3", round, n)
		}
	}
}
