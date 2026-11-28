package queuewrites_test

import (
	"slices"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The races of the slot transfer writes whose winner is not decided (so they are not in the goldens): they assert what always holds.

const (
	hughSubject = "f4000000-0000-4000-8000-000000000007"
	gilSubject  = "f4000000-0000-4000-8000-000000000006"
	linkToken   = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
	noonSession = "a3000000-0000-4000-8000-000000000006"
	gilPlayerID = "d4000000-0000-4000-8000-000000000006"
)

// Two players claim one transfer link at the same moment: the claim is one conditional update, so one gets it (200) and the other is told
// it was claimed first (409). The link has one claimant, and only the claimant became a member of the club.
func TestRaceTwoPlayersClaimOneLink(t *testing.T) {
	e := writetest.NewEnv(t, clock, build)
	e.Players = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), scenario(t, "slottransfer.cases.json", "p6_hugh_link"))
	claim := func(subject string) writetest.Request {
		return writetest.Request{Method: "POST", Path: "/api/public-sessions/noon-break/slot-transfer/link/claim", App: "player", Bearer: e.PlayerPass(t, subject),
			Headers: map[string]string{"Origin": "http://localhost:9000", "Content-Type": "application/json"}, Body: `{"token":"` + linkToken + `"}`}
	}
	got := statuses(e.DoAll([]writetest.Request{claim(gilSubject), claim(hughSubject)}))
	slices.Sort(got)
	if !slices.Equal(got, []int{200, 409}) {
		t.Fatalf("statuses %v, want a 200 and a 409", got)
	}
	if n := count(t, e, `SELECT count(*)::int FROM session_slot_transfers WHERE session_id = $1 AND recipient_player_id IS NOT NULL AND status = 'pending'`, noonSession); n != 1 {
		t.Errorf("%d claimed transfers, want 1", n)
	}
	if n := count(t, e, `SELECT count(*)::int FROM club_players WHERE player_id IN ($1, 'd4000000-0000-4000-8000-000000000007')`, gilPlayerID); n != 1 {
		t.Errorf("%d new members, want only the claimant", n)
	}
}

// Two Queue Masters (or two taps) approve two transfers to one recipient at the same moment: the session row is locked, so the second finds
// the recipient already seated and is refused. The recipient ends with one live entry and the roster keeps its count.
func TestRaceTwoApprovalsToOneRecipient(t *testing.T) {
	e := writetest.NewEnv(t, clock, build)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), scenario(t, "approve.cases.json", "ann_and_ben_to_gil"))
	approve := func(transfer string) writetest.Request {
		return writetest.Request{Method: "POST", Path: "/api/sessions/" + noonSession + "/requests/transfers/" + transfer + "/approve", App: "club", Bearer: e.ClubPass(t, smash),
			Body: `{"level":"intermediate_low"}`}
	}
	got := statuses(e.DoAll([]writetest.Request{approve("a3d00000-0000-4000-8000-000000000001"), approve("a3d00000-0000-4000-8000-000000000002")}))
	slices.Sort(got)
	if !slices.Equal(got, []int{200, 409}) {
		t.Fatalf("statuses %v, want a 200 and a 409", got)
	}
	live := `SELECT count(*)::int FROM session_players sp JOIN club_players cp ON cp.id = sp.club_player_id WHERE sp.session_id = $1 AND sp.released_at IS NULL AND sp.no_show_at IS NULL`
	if n := count(t, e, live+` AND cp.player_id = $2`, noonSession, gilPlayerID); n != 1 {
		t.Errorf("the recipient has %d live entries, want 1", n)
	}
	if n := count(t, e, live, noonSession); n != 4 {
		t.Errorf("%d live entries, want the 4 the night had", n)
	}
	if n := count(t, e, `SELECT count(*)::int FROM session_slot_transfers WHERE session_id = $1 AND status = 'approved'`, noonSession); n != 1 {
		t.Errorf("%d approved transfers, want 1", n)
	}
}

// An approval and a rejection of one transfer at the same moment: one decides it, the other is refused as already decided.
func TestRaceApproveAndRejectOneTransfer(t *testing.T) {
	e := writetest.NewEnv(t, clock, build)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), scenario(t, "approve.cases.json", "ann_to_gil"))
	path := "/api/sessions/" + noonSession + "/requests/transfers/a3d00000-0000-4000-8000-000000000001/"
	call := func(action, body string) writetest.Request {
		return writetest.Request{Method: "POST", Path: path + action, App: "club", Bearer: e.ClubPass(t, smash), Body: body}
	}
	got := statuses(e.DoAll([]writetest.Request{call("approve", `{"level":"intermediate_low"}`), call("reject", `{}`)}))
	slices.Sort(got)
	if !slices.Equal(got, []int{200, 409}) {
		t.Fatalf("statuses %v, want a 200 and a 409", got)
	}
	var status string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT status::text FROM session_slot_transfers WHERE id = 'a3d00000-0000-4000-8000-000000000001'`).Scan(&status); err != nil {
		t.Fatal(err)
	}
	released := count(t, e, `SELECT count(*)::int FROM session_players WHERE id = 'a7000000-0000-4000-8000-000000000041' AND released_at IS NOT NULL`)
	if (status == "approved") != (released == 1) {
		t.Errorf("status %s but the sender's entry released = %d", status, released)
	}
}
