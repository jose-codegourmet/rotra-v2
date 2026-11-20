package queuewrites_test

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"sort"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

const (
	smash     = "c7000000-0000-4000-8000-000000000001"
	session1  = "a3000000-0000-4000-8000-000000000001"
	session2  = "a3000000-0000-4000-8000-000000000002"
	level     = "intermediate_low"
	gus, gail = "c6000000-0000-4000-8000-000000000001", "c6000000-0000-4000-8000-000000000002"
)

var clock = time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC)

func raceEnv(t *testing.T) *writetest.Env {
	t.Helper()
	e := writetest.NewEnv(t, clock, build)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	return e
}

func batchRequest(e *writetest.Env, t *testing.T, session string, ops ...map[string]any) writetest.Request {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operations": ops})
	if err != nil {
		t.Fatal(err)
	}
	return writetest.Request{
		Method: "POST", Path: "/api/sessions/" + session + "/roster/batch", App: "club", Bearer: e.ClubPass(t, smash), Body: string(body),
	}
}

func addSaved(op int, player string) map[string]any {
	return map[string]any{"op": "add", "source": "saved", "operationId": fmt.Sprintf("b0000000-0000-4000-8000-%012d", op), "clubPlayerId": player, "level": level}
}

func count(t *testing.T, e *writetest.Env, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := e.Pool.QueryRow(e.Ctx, sql, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func statuses(ws []*httptest.ResponseRecorder) []int {
	out := make([]int, len(ws))
	for i, w := range ws {
		out[i] = w.Code
	}
	sort.Ints(out)
	return out
}

// The same player added at the same moment under two operation ids: the session lock queues them, so one is admitted and the
// other finds the player already on the roster (409), whichever runs first. The loser rolled back, revision bump included. Which
// of the two wins is not decided, so this is not in the golden file.
func TestRaceSamePlayerUnderTwoOperations(t *testing.T) {
	e := raceEnv(t)
	got := e.DoAll([]writetest.Request{
		batchRequest(e, t, session1, addSaved(10, gus)),
		batchRequest(e, t, session1, addSaved(11, gus)),
	})
	if s := statuses(got); s[0] != 200 || s[1] != 409 {
		t.Fatalf("statuses %v, want one 200 and one 409", s)
	}
	if n := count(t, e, `SELECT count(*) FROM session_players WHERE session_id = $1 AND club_player_id = $2`, session1, gus); n != 1 {
		t.Errorf("%d roster rows for the player, want 1", n)
	}
	if n := count(t, e, `SELECT count(*) FROM club_assessments WHERE club_player_id = $1 AND session_id = $2`, gus, session1); n != 1 {
		t.Errorf("%d assessments, want 1", n)
	}
	if n := count(t, e, `SELECT revision::int FROM queue_sessions WHERE id = $1`, session1); n != 6 {
		t.Errorf("revision %d, want 6 (5 and one successful write)", n)
	}
}

// Two different players race for the last slot of Prep Open (capacity 2, Hal is in): both are placed, one in the slot and one on
// the waitlist, never both in the slot (the budget holds without Add anyway).
func TestRaceForTheLastSlotNeverOverfills(t *testing.T) {
	e := raceEnv(t)
	got := e.DoAll([]writetest.Request{
		batchRequest(e, t, session1, addSaved(10, gus)),
		batchRequest(e, t, session1, addSaved(11, gail)),
	})
	if s := statuses(got); s[0] != 200 || s[1] != 200 {
		t.Fatalf("statuses %v", s)
	}
	if n := count(t, e, `SELECT count(*) FROM session_players WHERE session_id = $1 AND released_at IS NULL`, session1); n != 2 {
		t.Errorf("%d on the roster, want 2 (the capacity)", n)
	}
	if n := count(t, e, `SELECT count(*) FROM session_waitlist WHERE session_id = $1`, session1); n != 1 {
		t.Errorf("%d waiting, want 1", n)
	}
	if n := count(t, e, `SELECT revision::int FROM queue_sessions WHERE id = $1`, session1); n != 7 {
		t.Errorf("revision %d, want 7 (5 and two writes)", n)
	}
}

// Writes to one session queue behind its lock; a write to another session does not wait (B-49).
func TestSessionLockIsPerSession(t *testing.T) {
	e := raceEnv(t)
	tx, err := e.Pool.Begin(e.Ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(e.Ctx) }()
	if _, err := tx.Exec(e.Ctx, `SELECT id FROM queue_sessions WHERE id = $1 FOR UPDATE`, session1); err != nil {
		t.Fatal(err)
	}
	blocked := make(chan *httptest.ResponseRecorder, 1)
	req := batchRequest(e, t, session1, addSaved(10, gus))
	go func() { blocked <- e.Do(req) }()
	// A write to another session goes through while session 1 is held.
	other := e.Do(batchRequest(e, t, session2, addSaved(11, gail)))
	if other.Code != 200 {
		t.Fatalf("the other session answered %d: %s", other.Code, other.Body)
	}
	select {
	case w := <-blocked:
		t.Fatalf("the write to the locked session finished (%d) before the lock was released", w.Code)
	case <-time.After(300 * time.Millisecond):
	}
	if err := tx.Commit(e.Ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case w := <-blocked:
		if w.Code != 200 {
			t.Fatalf("after the release: %d %s", w.Code, w.Body)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the write never finished after the lock was released")
	}
}
