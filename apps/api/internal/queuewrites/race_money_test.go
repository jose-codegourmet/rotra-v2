package queuewrites_test

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The races of the money writes whose winner is not decided (so they are not in money.golden.json): they assert what always holds.

const (
	item1       = "b1000000-0000-4000-8000-000000000001"
	newItem     = "b1000000-0000-4000-8000-000000000010"
	liveSession = "a3000000-0000-4000-8000-000000000003"
	halClub     = "c6000000-0000-4000-8000-000000000007"
	hal3        = "a7000000-0000-4000-8000-000000000004"
)

// moneyEnv has one shuttle item and a custom estimate (900 a head) on the live session, whose roster is Hal, Ivy and Jo.
func moneyEnv(t *testing.T) *writetest.Env {
	t.Helper()
	e := writetest.NewEnv(t, clock, build)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), []string{
		`INSERT INTO inventory_items (id, club_id, name, category, unit, stock, unit_cost_minor, created_at, updated_at, revision) VALUES
		 ('` + item1 + `', 'c9000000-0000-4000-8000-000000000001', 'Yonex AS-50', 'shuttlecocks', 'tube', 12, 145000, now(), now(), 1)`,
		`INSERT INTO session_cost_estimates (session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode, custom_fee_per_head_minor, created_at, updated_at)
		 VALUES ('` + liveSession + `', 'c9000000-0000-4000-8000-000000000001', 35000, 6000, 'custom', 90000, now(), now())`,
	})
	return e
}

func post(e *writetest.Env, t *testing.T, path string, body map[string]any) writetest.Request {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	return writetest.Request{Method: "POST", Path: path, App: "club", Bearer: e.ClubPass(t, smash), Body: string(raw)}
}

func item(name string, revision string) map[string]any {
	return map[string]any{"id": item1, "name": name, "category": "shuttlecocks", "unit": "tube", "stock": 3, "unitCostMinor": 100000, "expectedRevision": revision}
}

// The edit of an item takes no row lock (neither does the TypeScript's), so two edits at one revision can both win: the second one
// reads the revision before the first commits and its update then adds one to what it finds. Either both are accepted (revision 3) or the
// second finds the new revision and is a conflict (revision 2), so the revision is one more than the number of edits that answered 200.
func TestRaceInventoryEditsAtOneRevision(t *testing.T) {
	e := moneyEnv(t)
	got := e.DoAll([]writetest.Request{post(e, t, "/api/inventory", item("First", "1")), post(e, t, "/api/inventory", item("Second", "1"))})
	ok := 0
	for _, w := range got {
		switch w.Code {
		case 200:
			ok++
		case 409:
		default:
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	if ok == 0 {
		t.Fatal("no edit was accepted")
	}
	if n := count(t, e, `SELECT revision::int FROM inventory_items WHERE id = $1`, item1); n != 1+ok {
		t.Errorf("revision %d with %d accepted edits", n, ok)
	}
}

// Two adds of one new id at the same moment: the second either finds the item (200, the same item) or runs into the unique index when
// the first commits (the TypeScript does not map it, so a 500). Never two items.
func TestRaceInventoryAddOfOneID(t *testing.T) {
	e := moneyEnv(t)
	add := func() writetest.Request {
		return post(e, t, "/api/inventory", map[string]any{"id": newItem, "name": "Aero", "category": "other", "stock": 1, "unitCostMinor": 100})
	}
	got := e.DoAll([]writetest.Request{add(), add()})
	ok := 0
	for _, w := range got {
		if w.Code == 200 {
			ok++
		} else if w.Code != 500 {
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	if ok == 0 {
		t.Error("no add was accepted")
	}
	if n := count(t, e, `SELECT count(*) FROM inventory_items WHERE id = $1`, newItem); n != 1 {
		t.Errorf("%d items with the id, want 1", n)
	}
}

// Two steps up at the same moment are one atomic update each, so none is lost.
func TestRaceStockStepsUp(t *testing.T) {
	e := moneyEnv(t)
	step := func() writetest.Request {
		return post(e, t, "/api/inventory/"+item1+"/stock", map[string]any{"delta": 1})
	}
	got := e.DoAll([]writetest.Request{step(), step()})
	for _, w := range got {
		if w.Code != 200 {
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	if n := count(t, e, `SELECT stock FROM inventory_items WHERE id = $1`, item1); n != 14 {
		t.Errorf("stock %d, want 14", n)
	}
	if n := count(t, e, `SELECT revision::int FROM inventory_items WHERE id = $1`, item1); n != 3 {
		t.Errorf("revision %d, want 3", n)
	}
}

func amountRequest(e *writetest.Env, t *testing.T, op int, minor int) writetest.Request {
	return post(e, t, "/api/sessions/"+liveSession+"/payments/amount", map[string]any{
		"operationId": fmt.Sprintf("b0000000-0000-4000-8000-%012d", op), "clubPlayerId": halClub, "amountMinor": minor,
	})
}

// Two different operations set the amount of one player at once: the session lock queues them, each replaces the mark, and one mark is
// left (the later one's). Which wins is not decided. The mark is never updated (a trigger refuses it), only deleted and inserted.
func TestRaceTwoAmountsForOnePlayer(t *testing.T) {
	e := moneyEnv(t)
	got := e.DoAll([]writetest.Request{amountRequest(e, t, 1, 50000), amountRequest(e, t, 2, 70000)})
	for _, w := range got {
		if w.Code != 200 {
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	if n := count(t, e, `SELECT count(*) FROM session_payment_marks WHERE session_player_id = $1`, hal3); n != 1 {
		t.Errorf("%d marks, want 1", n)
	}
	if n := count(t, e, `SELECT amount_minor FROM session_payment_marks WHERE session_player_id = $1`, hal3); n != 50000 && n != 70000 {
		t.Errorf("amount %d, want one of the two", n)
	}
}

// Mark all paid and a batch tick of one player race: the lock makes them one after the other, so each player has one mark and the two
// counts add up to the roster of three, whoever is first.
func TestRaceMarkAllAndATick(t *testing.T) {
	e := moneyEnv(t)
	all := post(e, t, "/api/sessions/"+liveSession+"/payments/mark-all", map[string]any{"operationId": "b0000000-0000-4000-8000-000000000001"})
	tick := post(e, t, "/api/sessions/"+liveSession+"/payments", map[string]any{
		"operationId": "b0000000-0000-4000-8000-000000000002", "marks": []any{map[string]any{"clubPlayerId": halClub, "paid": true}},
	})
	got := e.DoAll([]writetest.Request{all, tick})
	var counted struct{ Count int }
	total := 0
	for i, w := range got {
		if w.Code != 200 {
			t.Fatalf("answered %d: %s", w.Code, w.Body)
		}
		if i == 0 {
			counted = decodeCount(t, w)
			total += counted.Count
		}
	}
	if n := count(t, e, `SELECT count(*) FROM session_payment_marks WHERE session_id = $1`, liveSession); n != 3 {
		t.Errorf("%d marks, want 3", n)
	}
	if total != 2 && total != 3 {
		t.Errorf("Mark all paid counted %d, want 2 (the tick came first) or 3", total)
	}
}

func decodeCount(t *testing.T, w *httptest.ResponseRecorder) struct{ Count int } {
	t.Helper()
	var out struct{ Count int }
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out
}
