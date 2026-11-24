package queuewrites_test

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The live-update events of the writes the golden cases cannot reach (their result and finalization cases fail against the older
// captures): a match finished or made invalid, Session done and its projection, and Create session.

const (
	gilPlayer = "d4000000-0000-4000-8000-000000000006"
	fayPlayer = "d4000000-0000-4000-8000-000000000005"
	smashPass = "c7000000-0000-4000-8000-000000000001"
	liveSess  = "a3000000-0000-4000-8000-000000000003"
	liveMatch = "a4000000-0000-4000-8000-000000000001"
)

// scenario reads a named scenario's statements from a case file.
func scenario(t *testing.T, file, name string) []string {
	t.Helper()
	var cf struct {
		Scenarios map[string][]string `json:"scenarios"`
	}
	writetest.ReadJSON(t, "testdata", file, &cf)
	stmts, ok := cf.Scenarios[name]
	if !ok {
		t.Fatalf("no scenario %q in %s", name, file)
	}
	return stmts
}

// withRegisteredPlayers links the saved players of the night's first match, Gus and Gail, to registered players Gil and Fay.
func withRegisteredPlayers(stmts []string) []string {
	return append(append([]string(nil), stmts...),
		`UPDATE club_players SET player_id = '`+gilPlayer+`' WHERE id = 'c6000000-0000-4000-8000-000000000001'`,
		`UPDATE club_players SET player_id = '`+fayPlayer+`' WHERE id = 'c6000000-0000-4000-8000-000000000002'`)
}

type eventRow struct {
	Kind    string
	Session *string
	Players []string
	ID      int64
}

func events(t *testing.T, e *writetest.Env, where string, args ...any) []eventRow {
	t.Helper()
	rows, err := e.Pool.Query(context.Background(), `SELECT id, kind, session_id::text, COALESCE((SELECT array_agg(p::text ORDER BY p::text) FROM unnest(player_ids) p), '{}') FROM live_update_events WHERE `+where+` ORDER BY id`, args...)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []eventRow
	for rows.Next() {
		var r eventRow
		if err := rows.Scan(&r.ID, &r.Kind, &r.Session, &r.Players); err != nil {
			t.Fatal(err)
		}
		out = append(out, r)
	}
	return out
}

func newPlayEnv(t *testing.T, name string) *writetest.Env {
	t.Helper()
	e := writetest.NewEnv(t, clock, buildWithReads)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), withRegisteredPlayers(scenario(t, "match.cases.json", name)))
	return e
}

func TestAMatchResultAddsAnEventNamingItsRegisteredPlayers(t *testing.T) {
	e := newPlayEnv(t, "play")
	pass := e.ClubPass(t, smashPass)
	res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions/" + liveSess + "/matches/" + liveMatch + "/result", App: "club", Bearer: pass,
		Body: `{"operationId":"b4000000-0000-4000-8000-000000000079","winningTeam":"A"}`})
	if res.Code != http.StatusOK {
		t.Fatalf("result = %d: %s", res.Code, res.Body)
	}
	got := events(t, e, `true`)
	if len(got) != 1 || got[0].Kind != "queue" || got[0].Session == nil || *got[0].Session != liveSess {
		t.Fatalf("events %+v, want one queue event on the session", got)
	}
	want := []string{gilPlayer, fayPlayer}
	sort.Strings(want)
	if strings.Join(got[0].Players, ",") != strings.Join(want, ",") {
		t.Fatalf("players %v, want Gil and Fay (the registered players of the match, never the guests)", got[0].Players)
	}
	var version int64
	if err := e.Pool.QueryRow(context.Background(), `SELECT latest_event_id FROM queue_sessions WHERE id = $1`, liveSess).Scan(&version); err != nil || version != got[0].ID {
		t.Fatalf("the session's version is %d (%v), want its newest event %d", version, err, got[0].ID)
	}
}

func TestAMatchMadeInvalidNamesItsRegisteredPlayersToo(t *testing.T) {
	e := newPlayEnv(t, "play")
	pass := e.ClubPass(t, smashPass)
	res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions/" + liveSess + "/matches/" + liveMatch + "/invalid", App: "club", Bearer: pass,
		Body: `{"operationId":"b4000000-0000-4000-8000-000000000107"}`})
	if res.Code != http.StatusOK {
		t.Fatalf("invalid = %d: %s", res.Code, res.Body)
	}
	got := events(t, e, `true`)
	if len(got) != 1 || len(got[0].Players) != 2 {
		t.Fatalf("events %+v, want one event naming two players", got)
	}
}

func TestAMatchWithOnlyGuestsNamesNoPlayer(t *testing.T) {
	e := writetest.NewEnv(t, clock, buildWithReads)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), scenario(t, "match.cases.json", "play"))
	pass := e.ClubPass(t, smashPass)
	res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions/" + liveSess + "/matches/" + liveMatch + "/result", App: "club", Bearer: pass,
		Body: `{"operationId":"b4000000-0000-4000-8000-000000000079","winningTeam":"B"}`})
	if res.Code != http.StatusOK {
		t.Fatalf("result = %d: %s", res.Code, res.Body)
	}
	if got := events(t, e, `true`); len(got) != 1 || len(got[0].Players) != 0 {
		t.Fatalf("events %+v, want one event with no player", got)
	}
}

func TestAFailedWriteLeavesNoEvent(t *testing.T) {
	e := newPlayEnv(t, "play")
	pass := e.ClubPass(t, smashPass)
	res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions/" + liveSess + "/matches/" + liveMatch + "/result", App: "club", Bearer: pass,
		Body: `{"operationId":"b4000000-0000-4000-8000-000000000089"}`}) // no winner: refused
	if res.Code == http.StatusOK {
		t.Fatalf("result = %d, want a refusal", res.Code)
	}
	if got := events(t, e, `true`); len(got) != 0 {
		t.Fatalf("a refused write left %+v", got)
	}
}

func TestSessionDoneAddsAnEventNamingTheRosterPlayersAndTheProjectionAnotherWhenItFinishes(t *testing.T) {
	e := writetest.NewEnv(t, clock, buildWithReads)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), withRegisteredPlayers(scenario(t, "finalize.cases.json", "played")))
	pass := e.ClubPass(t, smashPass)
	res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions/" + liveSess + "/finalization", App: "club", Bearer: pass,
		Body: `{"commandId":"b1000000-0000-4000-8000-000000000001"}`})
	if res.Code != http.StatusOK && res.Code != http.StatusCreated {
		t.Fatalf("finalization = %d: %s", res.Code, res.Body)
	}
	var status struct {
		State string `json:"state"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &status)
	all := events(t, e, `true`)
	if len(all) == 0 {
		t.Fatal("Session done added no event")
	}
	first := all[0]
	if first.Kind != "finalization" || first.Session == nil || *first.Session != liveSess {
		t.Fatalf("first event %+v", first)
	}
	var registered []string
	rows, err := e.Pool.Query(context.Background(), `SELECT DISTINCT cp.player_id::text FROM session_players sp JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id WHERE sp.session_id = $1 AND cp.player_id IS NOT NULL ORDER BY 1`, liveSess)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var p string
		_ = rows.Scan(&p)
		registered = append(registered, p)
	}
	rows.Close()
	if len(registered) == 0 || strings.Join(first.Players, ",") != strings.Join(registered, ",") {
		t.Fatalf("players %v, want the registered players of the roster %v", first.Players, registered)
	}
	// The projection that Session done drives finishes its jobs: each tells the session's and the players' screens.
	if len(all) < 2 {
		t.Fatalf("%d events: the projection jobs added none", len(all))
	}
	last := all[len(all)-1]
	if last.Kind != "finalization" || len(last.Players) == 0 {
		t.Fatalf("last event %+v, want a finalization event naming the players the facts belong to", last)
	}
}

func TestCreateSessionAddsAnEventPerSessionMadeAndAReplayAddsNone(t *testing.T) {
	e := writetest.NewEnv(t, clock, buildWithReads)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	pass := e.ClubPass(t, smashPass)
	body := `{"commandId":"11111111-1111-4111-8111-111111111111","input":{"title":"Saturday Smash","venueId":"a5000000-0000-4000-8000-000000000001","scheduledStartAt":"2026-12-05T01:00:00.000Z","scheduledEndAt":"2026-12-05T05:00:00.000Z","sessionMode":"fair","allowSingles":true,"allowDoubles":true,"minimumGames":2,"minimumIsCalculated":false,"expectedPlayers":null,"courts":[{"label":"Court 1"}]}}`
	res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions", App: "club", Bearer: pass, Body: body})
	if res.Code != http.StatusCreated {
		t.Fatalf("create = %d: %s", res.Code, res.Body)
	}
	got := events(t, e, `true`)
	if len(got) != 1 || got[0].Kind != "session" || got[0].Session == nil {
		t.Fatalf("events %+v, want one session event for the session made", got)
	}
	if res := e.Do(writetest.Request{Method: "POST", Path: "/api/sessions", App: "club", Bearer: pass, Body: body}); res.Code != http.StatusCreated {
		t.Fatalf("replay = %d: %s", res.Code, res.Body)
	}
	if again := events(t, e, `true`); len(again) != 1 {
		t.Fatalf("a replay of the same command added %d events", len(again)-1)
	}
}

func TestClubWideWritesAddAClubEventWithNoSession(t *testing.T) {
	e := writetest.NewEnv(t, clock, buildWithReads)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	pass := e.ClubPass(t, smashPass)
	for _, c := range []struct{ method, path, body string }{
		{"PATCH", "/api/club", `{"selfCheckInEnabled":false,"expectedRevision":"1"}`},
		{"POST", "/api/club/invite", ``},
	} {
		before := len(events(t, e, `true`))
		res := e.Do(writetest.Request{Method: c.method, Path: c.path, App: "club", Bearer: pass, Body: c.body})
		if res.Code != http.StatusOK {
			t.Fatalf("%s %s = %d: %s", c.method, c.path, res.Code, res.Body)
		}
		got := events(t, e, `true`)
		if len(got) != before+1 || got[len(got)-1].Session != nil || got[len(got)-1].Kind != "club" {
			t.Fatalf("%s %s: events %+v, want one more club-wide event of kind club", c.method, c.path, got)
		}
	}
}
