package queuewrites_test

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// What the golden files cannot pin: races whose winner is not decided, and the requests a later slice finishes.

func jsonRequest(e *writetest.Env, t *testing.T, method, path string, body any) writetest.Request {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	return writetest.Request{Method: method, Path: path, App: "club", Bearer: e.ClubPass(t, smash), Body: string(raw)}
}

const smashHall = "a5000000-0000-4000-8000-000000000001"

func sessionForm(start, end string) map[string]any {
	return map[string]any{
		"title": "Race Night", "notes": "", "venueId": smashHall, "scheduledStartAt": start, "scheduledEndAt": end, "sessionMode": "fair",
		"allowSingles": true, "allowDoubles": true, "minimumGames": 1, "minimumIsCalculated": false, "expectedPlayers": nil,
		"courts": []map[string]any{{"label": "Court 1"}},
	}
}

// Two creates of one command at the same moment: the unique source command refuses the second insert (a conflict) or the second
// request sees the first one's sessions. Either way one session exists.
func TestRaceCreateSameCommand(t *testing.T) {
	e := raceEnv(t)
	req := jsonRequest(e, t, "POST", "/api/sessions", map[string]any{"commandId": "race-1", "input": sessionForm("2026-12-05T01:00:00.000Z", "2026-12-05T05:00:00.000Z")})
	got := e.DoAll([]writetest.Request{req, req})
	s := statuses(got)
	if s[0] != 201 || (s[1] != 201 && s[1] != 409) {
		t.Fatalf("statuses %v, want a 201 and a 201 or 409", s)
	}
	if n := count(t, e, `SELECT count(*) FROM queue_sessions WHERE title = 'Race Night'`); n != 1 {
		t.Errorf("%d sessions, want 1", n)
	}
}

// Two creates of one new venue, and two edits at one revision, run without a lock (as in the TypeScript): each ends as a success or
// a refusal, and never as a crash or two venues.
func TestRaceVenueWrites(t *testing.T) {
	e := raceEnv(t)
	create := jsonRequest(e, t, "POST", "/api/venues", map[string]any{"id": "a5000000-0000-4000-8000-000000000199", "name": "Raced Hall"})
	for _, code := range statuses(e.DoAll([]writetest.Request{create, create})) {
		if code != 201 && code != 409 {
			t.Errorf("create answered %d", code)
		}
	}
	if n := count(t, e, `SELECT count(*) FROM club_venues WHERE name = 'Raced Hall'`); n != 1 {
		t.Errorf("%d venues, want 1", n)
	}
	edit := jsonRequest(e, t, "POST", "/api/venues", map[string]any{"id": smashHall, "name": "Edited Hall", "expectedRevision": "1"})
	for _, code := range statuses(e.DoAll([]writetest.Request{edit, edit})) {
		if code != 201 && code != 409 {
			t.Errorf("edit answered %d", code)
		}
	}
	if n := count(t, e, `SELECT revision::int FROM club_venues WHERE id = $1`, smashHall); n < 2 || n > 3 {
		t.Errorf("revision %d, want 2 (one edit won) or 3 (both read revision 1, as in the TypeScript)", n)
	}
}

// A club logo is an upload (out of this track's scope): the write stops with a 500 instead of skipping that part. The cost estimate of a
// Save is ported (money.golden.json).
func TestUnportedPartsStop(t *testing.T) {
	e := raceEnv(t)
	cases := map[string]writetest.Request{
		"club logo": jsonRequest(e, t, "PATCH", "/api/club", map[string]any{"expectedRevision": "1", "logoUrl": nil}),
	}
	for name, req := range cases {
		if got := e.Do(req).Code; got != 500 {
			t.Errorf("%s answered %d, want 500", name, got)
		}
	}
	// A court that is not open yet cannot reach the placement: the court command refuses first.
	if got := e.Do(jsonRequest(e, t, "POST", fmt.Sprintf("/api/sessions/%s/courts/open-early", session1), map[string]any{})).Code; got != 422 {
		t.Errorf("a prepared session answered %d, want 422", got)
	}
}
