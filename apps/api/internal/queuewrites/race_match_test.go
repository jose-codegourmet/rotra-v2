package queuewrites_test

import (
	"fmt"
	"slices"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Match races whose winner is not decided, so the golden files do not pin them: what always holds is tested here. The scenarios are the
// ones of the match case file.
func matchRaceEnv(t *testing.T, scenario string) *writetest.Env {
	t.Helper()
	var doc struct {
		Scenarios map[string][]string `json:"scenarios"`
	}
	writetest.ReadJSON(t, "testdata", "match.cases.json", &doc)
	stmts, ok := doc.Scenarios[scenario]
	if !ok {
		t.Fatalf("no scenario %q", scenario)
	}
	e := writetest.NewEnv(t, clock, build)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), stmts)
	return e
}

const live = "/api/sessions/a3000000-0000-4000-8000-000000000003"

// Two different operations placing one waiting match at the same moment: one places it, the other finds it placed and conflicts.
func TestRacePlaceOneMatchTwice(t *testing.T) {
	e := matchRaceEnv(t, "s3_waiting_matches")
	place := func(op int) writetest.Request {
		return jsonRequest(e, t, "POST", live+"/matches/a4000000-0000-4000-8000-000000000001/place", map[string]any{
			"operationId": fmt.Sprintf("b4000000-0000-4000-8000-%012d", op), "courtIds": []string{"a2c00000-0000-4000-8000-000000000003"}})
	}
	got := statuses(e.DoAll([]writetest.Request{place(1), place(2)}))
	slices.Sort(got)
	if !slices.Equal(got, []int{200, 409}) {
		t.Fatalf("statuses %v, want a 200 and a 409", got)
	}
	if n := count(t, e, `SELECT count(*)::int FROM active_court_holds WHERE match_id = 'a4000000-0000-4000-8000-000000000001'`); n != 1 {
		t.Errorf("%d court holds, want 1", n)
	}
}

// Two results that disagree arriving at once: the first decides, the second is quarantined as a conflict and never overwrites it.
func TestRaceTwoResultsThatDisagree(t *testing.T) {
	e := matchRaceEnv(t, "play")
	result := func(op int, winner string) writetest.Request {
		return jsonRequest(e, t, "POST", live+"/matches/a4000000-0000-4000-8000-000000000001/result", map[string]any{
			"operationId": fmt.Sprintf("b4000000-0000-4000-8000-%012d", op), "winningTeam": winner})
	}
	got := statuses(e.DoAll([]writetest.Request{result(1, "A"), result(2, "B")}))
	slices.Sort(got)
	if !slices.Equal(got, []int{200, 409}) {
		t.Fatalf("statuses %v, want a 200 and a 409", got)
	}
	if n := count(t, e, `SELECT count(*)::int FROM match_decisions WHERE match_id = 'a4000000-0000-4000-8000-000000000001'`); n != 1 {
		t.Errorf("%d decisions, want 1", n)
	}
	if n := count(t, e, `SELECT count(*)::int FROM sync_conflicts WHERE category = 'contradictory_decision'`); n != 1 {
		t.Errorf("%d conflicts, want 1", n)
	}
}

// Two different request ids from one Player at the same moment: the first is saved, the second finds an open request and conflicts.
func TestRaceTwoMatchRequestsFromOnePlayer(t *testing.T) {
	e := matchRaceEnv(t, "s3_full_house")
	e.RelinkPlayers(t)
	ask := func(id string) writetest.Request {
		return writetest.Request{Method: "POST", Path: "/api/public-sessions/live-now/match-request", App: "player", Bearer: e.PlayerPass(t, "f4000000-0000-4000-8000-000000000001"),
			Headers: map[string]string{"Origin": "http://localhost:9000", "Content-Type": "application/json"}, Body: `{"requestId":"` + id + `","format":"doubles"}`}
	}
	got := statuses(e.DoAll([]writetest.Request{ask("b5000000-0000-4000-8000-000000000005"), ask("b5000000-0000-4000-8000-000000000006")}))
	slices.Sort(got)
	if !slices.Equal(got, []int{201, 409}) {
		t.Fatalf("statuses %v, want a 201 and a 409", got)
	}
	if n := count(t, e, `SELECT count(*)::int FROM session_match_requests WHERE session_player_id = 'a7000000-0000-4000-8000-000000000022' AND status = 'open'`); n != 1 {
		t.Errorf("%d open requests, want 1", n)
	}
}
