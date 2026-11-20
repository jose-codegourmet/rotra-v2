package queuewrites_test

import (
	"net/http"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Keep and Remove from roster race for one drop-out notice, and two different Edit details race for the last name. Which request wins is
// not decided, so the golden files do not pin them; what always holds is tested here.
func TestRaceKeepAndRemoveADropOutNotice(t *testing.T) {
	e := raceEnv(t)
	const notice, entry = "a3800000-0000-4000-8000-000000000001", "a7000000-0000-4000-8000-000000000001"
	if _, err := e.Pool.Exec(e.Ctx, `INSERT INTO session_drop_out_notices (id, club_id, session_id, session_player_id, player_id, status, created_at)
		VALUES ($1, 'c9000000-0000-4000-8000-000000000001', $2, $3, 'd4000000-0000-4000-8000-000000000001', 'open', TIMESTAMPTZ '2026-11-18 01:00:00+00')`, notice, session1, entry); err != nil {
		t.Fatal(err)
	}
	base := "/api/sessions/" + session1 + "/requests/drop-outs/" + notice
	pass := e.ClubPass(t, smash)
	got := e.DoAll([]writetest.Request{
		{Method: "POST", Path: base + "/keep", App: "club", Bearer: pass},
		{Method: "POST", Path: base + "/remove", App: "club", Bearer: pass},
	})
	codes := statuses(got)
	oneWins := (codes[0] == http.StatusOK && codes[1] == http.StatusConflict) || (codes[0] == http.StatusConflict && codes[1] == http.StatusOK)
	if !oneWins {
		t.Fatalf("statuses %v, want one 200 and one 409", codes)
	}
	var decision string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT decision::text FROM session_drop_out_notices WHERE id = $1`, notice).Scan(&decision); err != nil {
		t.Fatal(err)
	}
	released := count(t, e, `SELECT count(*)::int FROM session_players WHERE id = $1 AND released_at IS NOT NULL`, entry)
	if (decision == "removed") != (released == 1) {
		t.Errorf("decision %q with released entries %d: the entry is released exactly when the notice was removed", decision, released)
	}
}

func TestRaceTwoEditsOfOneSavedPlayer(t *testing.T) {
	e := raceEnv(t)
	const una = "c6000000-0000-4000-8000-000000000005"
	pass := e.ClubPass(t, smash)
	body := func(name string) string { return `{"fullName":"` + name + `"}` }
	got := e.DoAll([]writetest.Request{
		{Method: "PATCH", Path: "/api/club/players/" + una, App: "club", Bearer: pass, Body: body("Una A")},
		{Method: "PATCH", Path: "/api/club/players/" + una, App: "club", Bearer: pass, Body: body("Una B")},
	})
	if codes := statuses(got); codes[0] != http.StatusOK || codes[1] != http.StatusOK {
		t.Fatalf("statuses %v, want two 200", codes)
	}
	var name string
	if err := e.Pool.QueryRow(e.Ctx, `SELECT display_name FROM club_players WHERE id = $1`, una).Scan(&name); err != nil {
		t.Fatal(err)
	}
	if name != "Una A" && name != "Una B" {
		t.Errorf("name %q, want one of the two", name)
	}
}

func TestRaceTwoJoinRequestsConfirmedAtOnce(t *testing.T) {
	e := raceEnv(t)
	pass := e.ClubPass(t, smash)
	confirm := func(request, op string) writetest.Request {
		return writetest.Request{Method: "POST", Path: "/api/join-requests/" + request + "/confirm", App: "club", Bearer: pass,
			Body: `{"operationId":"` + op + `","level":"` + level + `"}`}
	}
	got := e.DoAll([]writetest.Request{
		confirm("a3400000-0000-4000-8000-000000000001", "b3000000-0000-4000-8000-000000000001"),
		confirm("a3400000-0000-4000-8000-000000000003", "b3000000-0000-4000-8000-000000000002"),
	})
	if codes := statuses(got); codes[0] != http.StatusOK || codes[1] != http.StatusOK {
		t.Fatalf("statuses %v, want two 200", codes)
	}
	if n := count(t, e, `SELECT count(*)::int FROM session_join_requests WHERE session_id = $1 AND status = 'confirmed' AND id IN ('a3400000-0000-4000-8000-000000000001', 'a3400000-0000-4000-8000-000000000003')`, session1); n != 2 {
		t.Errorf("%d requests confirmed, want 2", n)
	}
	// The session revision moved once for each (the order of the two is not decided).
	if n := count(t, e, `SELECT (revision - 5)::int FROM queue_sessions WHERE id = $1`, session1); n != 2 {
		t.Errorf("revision moved by %d, want 2", n)
	}
}
