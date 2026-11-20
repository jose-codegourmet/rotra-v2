package queuewrites_test

import (
	"encoding/json"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The races of Session done whose winner is not decided (so they are not in finalize.golden.json): they assert what always holds. A second
// request waits for the session lock, finds the committed finalization and drives its jobs too; a job is claimed with SKIP LOCKED, so it runs once.

const (
	finalizeCmd1 = "b1000000-0000-4000-8000-000000000001"
	finalizeCmd2 = "b1000000-0000-4000-8000-000000000002"
	oldSession   = "a3000000-0000-4000-8000-000000000004"
)

// finalizeEnv starts from a scenario of finalize.cases.json.
func finalizeEnv(t *testing.T, scenario string) *writetest.Env {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "finalize.cases.json", &cf)
	statements, ok := cf.Scenarios[scenario]
	if !ok {
		t.Fatalf("no scenario %s", scenario)
	}
	e := writetest.NewEnv(t, clock, buildWithReads)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), statements)
	return e
}

func finalizeRequest(e *writetest.Env, t *testing.T, command string) writetest.Request {
	t.Helper()
	raw, _ := json.Marshal(map[string]string{"commandId": command})
	return writetest.Request{Method: "POST", Path: "/api/sessions/" + liveSession + "/finalization", App: "club", Bearer: e.ClubPass(t, smash), Body: string(raw)}
}

func statusRequest(e *writetest.Env, t *testing.T, session string) writetest.Request {
	t.Helper()
	return writetest.Request{Method: "GET", Path: "/api/sessions/" + session + "/finalization", App: "club", Bearer: e.ClubPass(t, smash)}
}

// assertFinalizedOnce is what holds however the requests interleave once the jobs have all run: one finalization, one set of facts, summaries and
// snapshot, every job run exactly once, one rank row and one notification per player, and the session revision moved once.
func assertFinalizedOnce(t *testing.T, e *writetest.Env) {
	t.Helper()
	for sql, want := range map[string]int{
		`SELECT count(*)::int FROM session_finalizations WHERE session_id = '` + liveSession + `'`:                                             1,
		`SELECT count(*)::int FROM session_finalizations WHERE session_id = '` + liveSession + `' AND state = 'done'`:                          1,
		`SELECT count(*)::int FROM player_match_facts WHERE session_id = '` + liveSession + `'`:                                                11,
		`SELECT count(*)::int FROM club_session_player_summaries WHERE session_id = '` + liveSession + `'`:                                     7,
		`SELECT count(*)::int FROM session_result_snapshots WHERE session_id = '` + liveSession + `'`:                                          1,
		`SELECT count(*)::int FROM projection_jobs WHERE source_finalization_id = '` + liveSession + `'`:                                       4,
		`SELECT count(*)::int FROM projection_jobs WHERE source_finalization_id = '` + liveSession + `' AND status = 'done' AND attempts <= 1`: 4,
		`SELECT count(*)::int FROM player_rank_current`:                                                                                        2,
		`SELECT count(*)::int FROM player_notifications WHERE kind = 'rank'`:                                                                   2,
		`SELECT revision::int FROM queue_sessions WHERE id = '` + liveSession + `'`:                                                            13,
	} {
		if got := count(t, e, sql); got != want {
			t.Errorf("%s: %d, want %d", sql, got, want)
		}
	}
}

func TestRaceSessionDoneTwiceWithOneCommand(t *testing.T) {
	e := finalizeEnv(t, "played")
	for _, w := range e.DoAll([]writetest.Request{finalizeRequest(e, t, finalizeCmd1), finalizeRequest(e, t, finalizeCmd1)}) {
		if w.Code != 200 {
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	// The status a request answers can show jobs another request still runs; a later read drives what is left.
	if w := e.Do(statusRequest(e, t, liveSession)); w.Code != 200 {
		t.Errorf("status answered %d: %s", w.Code, w.Body)
	}
	assertFinalizedOnce(t, e)
}

func TestRaceSessionDoneTwiceWithTwoCommands(t *testing.T) {
	e := finalizeEnv(t, "played")
	for _, w := range e.DoAll([]writetest.Request{finalizeRequest(e, t, finalizeCmd1), finalizeRequest(e, t, finalizeCmd2)}) {
		if w.Code != 200 {
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	e.Do(statusRequest(e, t, liveSession))
	assertFinalizedOnce(t, e)
	// Only the winner's command is stored: the other one is not a second finalization.
	if n := count(t, e, `SELECT count(*)::int FROM session_finalizations WHERE command_id IN ('`+finalizeCmd1+`', '`+finalizeCmd2+`')`); n != 1 {
		t.Errorf("%d finalizations carry the two commands", n)
	}
}

// Two reads of a finalization with a due job drive it at the same moment: the job is claimed by one of them and runs once.
func TestRaceStatusReadsDriveAJobOnce(t *testing.T) {
	e := finalizeEnv(t, "d_history_pending")
	got := e.DoAll([]writetest.Request{statusRequest(e, t, oldSession), statusRequest(e, t, oldSession), statusRequest(e, t, oldSession)})
	for _, w := range got {
		if w.Code != 200 {
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	if n := count(t, e, `SELECT attempts FROM projection_jobs WHERE kind = 'player_history' AND source_finalization_id = '`+oldSession+`'`); n != 1 {
		t.Errorf("the job was claimed %d times, want once", n)
	}
	if n := count(t, e, `SELECT count(*)::int FROM session_finalizations WHERE session_id = '`+oldSession+`' AND state = 'done'`); n != 1 {
		t.Errorf("the finalization is not done")
	}
}
