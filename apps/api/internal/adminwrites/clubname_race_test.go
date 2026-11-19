package adminwrites_test

import (
	"fmt"
	"testing"
)

const (
	lahug        = "d1000000-0000-4000-8000-000000000001"
	lahugRequest = "e5000000-0000-4000-8000-000000000001"
)

func reviewBody(request, decision string) string {
	return fmt.Sprintf(`{"requestId":%q,"decision":%q}`, request, decision)
}

// Decisions on one request that run at once. The review reads the request before it locks the club and does not read it
// again (reviewClubNameChange), so a second decision that read it before the first committed applies on top of it: the
// Route Handler can write a second audit event, count the club's revision twice, and even leave a request rejected
// over a club that was renamed. That is ported as it is (see the deviations log, for the owner), and it depends on
// timing, so the golden file does not pin it. What always holds is checked here, many times over: every answer is
// 200 or 409, someone won, the request is decided, and there is at least one audit event and never more than answers.
func TestRaceOfDecisionsOnOneRequest(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 16; round++ {
		reset()
		decisions := [][]string{{"approved", "approved"}, {"approved", "rejected"}, {"rejected", "rejected"}}[round%3]
		got := sendAll(t, e, owner, "PATCH", "/api/clubs/"+lahug, reviewBody(lahugRequest, decisions[0]), reviewBody(lahugRequest, decisions[1]))
		ok := 0
		for _, w := range got {
			switch w.Code {
			case 200:
				ok++
			case 409:
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok == 0 {
			t.Fatalf("round %d: nobody won", round)
		}
		var state string
		if err := e.Pool.QueryRow(e.Ctx, `SELECT state::text FROM club_name_change_requests WHERE id = $1`, lahugRequest).Scan(&state); err != nil {
			t.Fatal(err)
		}
		if state != "approved" && state != "rejected" {
			t.Fatalf("round %d: the request is %s", round, state)
		}
		events := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action LIKE 'club.name_change_%'`)
		if events < 1 || events > ok {
			t.Fatalf("round %d: %d audit events for %d answers", round, events, ok)
		}
	}
}

// Two clubs ask for one name and both are approved at once. The club locks do not meet, so both can pass the check that
// the name key is free; the loser then fails on the unique key (the same `conflict` on `name`). One club gets the name.
func TestRaceOfTwoClubsApprovingOneName(t *testing.T) {
	e, reset := clubsEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		e.Setup(t, []string{`INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, state, source_command_id, created_at, updated_at, revision) VALUES ('e5000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-000000000004', 'Free Birds Collective', 'free birds collective', TIMESTAMPTZ '2026-11-18 08:00:00+00', 'pending', 'c3000000-0000-4000-8000-000000000016', TIMESTAMPTZ '2026-11-18 08:00:00+00', TIMESTAMPTZ '2026-11-18 08:00:00+00', 1)`})
		got := e.DoAll(requests(t, e,
			"/api/clubs/d1000000-0000-4000-8000-000000000002", reviewBody("e5000000-0000-4000-8000-000000000002", "approved"),
			"/api/clubs/d1000000-0000-4000-8000-000000000004", reviewBody("e5000000-0000-4000-8000-000000000006", "approved")))
		wins, conflicts := 0, 0
		for _, w := range got {
			switch w.Code {
			case 200:
				wins++
			case 409:
				conflicts++
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if wins != 1 || conflicts != 1 {
			t.Fatalf("round %d: %d wins, %d conflicts", round, wins, conflicts)
		}
		if n := count(t, e, `SELECT count(*) FROM clubs WHERE name_key = 'free birds collective'`); n != 1 {
			t.Fatalf("round %d: %d clubs hold the name", round, n)
		}
	}
}
