package playerwrites_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Tests of what the captured cases cannot pin: a route the TypeScript answers differently on purpose, and the races the
// TypeScript leaves to timing (its answers can differ between runs, so a golden file cannot hold them: each test checks what
// always holds).

const (
	alice = "f4000000-0000-4000-8000-000000000001"
	bob   = "f4000000-0000-4000-8000-000000000002"
	dan   = "f4000000-0000-4000-8000-000000000004"
	hal   = "f4000000-0000-4000-8000-000000000008"

	aliceID = "d4000000-0000-4000-8000-000000000001"
	danID   = "d4000000-0000-4000-8000-000000000004"
	bobRev  = "9007199254740993"
)

var now = time.Date(2026, 11, 20, 4, 0, 0, 0, time.UTC)

// fresh is a migrated database with the seed loaded, Alice, Bob, Dan and Hal ready to sign in.
func fresh(t *testing.T) *writetest.Env {
	t.Helper()
	e := writetest.NewEnv(t, now, build)
	e.Players = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "player.seed.sql"), nil)
	return e
}

func send(e *writetest.Env, t *testing.T, who, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	return e.Do(writetest.Request{Method: method, Path: path, App: "player", Bearer: e.PlayerPass(t, who), Body: body})
}

func code(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var m struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &m)
	return m.Error.Code
}

func scalar(t *testing.T, e *writetest.Env, sql string, args ...any) string {
	t.Helper()
	var out string
	if err := e.Pool.QueryRow(e.Ctx, sql, args...).Scan(&out); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
	return out
}

func statuses(ws []*httptest.ResponseRecorder) (ok, conflict int) {
	for _, w := range ws {
		switch w.Code {
		case http.StatusOK, http.StatusCreated:
			ok++
		case http.StatusConflict:
			conflict++
		}
	}
	return ok, conflict
}

// The picture upload of PATCH /api/me/profile (a multipart body) belongs to the pictures track: Go answers 503 and writes
// nothing, and a JSON body on the same route still saves.
func TestMultipartProfileIsNotServed(t *testing.T) {
	e := fresh(t)
	before := scalar(t, e, `SELECT full_name || revision::text FROM players WHERE id = $1`, aliceID)
	// Do labels a body as JSON, so the multipart request is built by hand.
	hr := httptest.NewRequest("PATCH", "/api/me/profile", strings.NewReader("--x\r\nContent-Disposition: form-data; name=\"expectedRevision\"\r\n\r\n3\r\n--x--\r\n"))
	hr.Host = "localhost:9001"
	hr.Header.Set("X-Rotra-Proxy-Secret", writetest.ProxySecret)
	hr.Header.Set("X-Rotra-App", "player")
	hr.Header.Set("Authorization", "Bearer "+e.PlayerPass(t, alice))
	hr.Header.Set("Content-Type", "multipart/form-data; boundary=x")
	rec := httptest.NewRecorder()
	e.Handler.ServeHTTP(rec, hr)
	if rec.Code != http.StatusServiceUnavailable || code(t, rec) != "unavailable" {
		t.Errorf("multipart: %d %s", rec.Code, rec.Body)
	}
	if after := scalar(t, e, `SELECT full_name || revision::text FROM players WHERE id = $1`, aliceID); after != before {
		t.Errorf("the upload wrote %q over %q", after, before)
	}
	if w := send(e, t, alice, "PATCH", "/api/me/profile", `{"expectedRevision":"3","fullName":"Alice Again","playingStyle":""}`); w.Code != 200 {
		t.Errorf("json: %d %s", w.Code, w.Body)
	}
}

// PATCH /api/me/notifications/unread-count is a 405 in Next (the static GET segment wins); here the segment is a notification ID
// like any other and is not found (after the body and the player are checked).
func TestUnreadCountSegmentIsANotificationID(t *testing.T) {
	e := fresh(t)
	w := send(e, t, dan, "PATCH", "/api/me/notifications/unread-count", `{"playerId":"`+danID+`"}`)
	if w.Code != 404 || code(t, w) != "not_found" {
		t.Errorf("%d %s", w.Code, w.Body)
	}
	if n := scalar(t, e, `SELECT count(*)::text FROM player_notifications WHERE read_at IS NULL AND player_id = $1`, danID); n != "5" {
		t.Errorf("nothing was marked: %s unread", n)
	}
}

// Only the Player app has these routes: the Queue and Admin apps get the generic 404, as they do today.
func TestOtherAppsDoNotServeThePlayerWrites(t *testing.T) {
	e := fresh(t)
	for _, app := range []string{"admin", "club", ""} {
		w := e.Do(writetest.Request{Method: "PATCH", Path: "/api/me/profile", App: app, Bearer: e.PlayerPass(t, alice), Body: `{}`})
		if w.Code != 404 {
			t.Errorf("app %q: %d", app, w.Code)
		}
	}
	// The read on the same path is still the Player's own.
	w := e.Do(writetest.Request{Method: "GET", Path: "/api/me/profile", App: "player", Bearer: e.PlayerPass(t, alice)})
	if w.Code != 200 {
		t.Errorf("GET /api/me/profile: %d %s", w.Code, w.Body)
	}
}

// Two stale writes to two different switches, sent together: nothing locks the row, so both can land (200 and 200) or the
// second can read the first's revision (200 and 409). What always holds: each answer that is 200 wrote its change, and the
// revision went up once for each.
func TestRaceOfTwoSwitchWrites(t *testing.T) {
	e := fresh(t)
	for round := 0; round < 12; round++ {
		e.Reseed(t, writetest.ReadSeed(t, "testdata", "player.seed.sql"), nil)
		pass := e.PlayerPass(t, alice)
		reqs := []writetest.Request{
			{Method: "POST", Path: "/api/me/stats-visibility", App: "player", Bearer: pass, Body: `{"showProfileStats":true,"expectedRevision":"3"}`},
			{Method: "POST", Path: "/api/me/stats-visibility", App: "player", Bearer: pass, Body: `{"showWeeklyPerformance":false,"expectedRevision":"3"}`},
			{Method: "POST", Path: "/api/me/directory-visibility", App: "player", Bearer: pass, Body: `{"hiddenFromDirectory":true,"expectedRevision":"3"}`},
		}
		got := e.DoAll(reqs)
		wrote := 0
		for i, w := range got {
			if w.Code != 200 && w.Code != 409 {
				t.Fatalf("round %d request %d: %d %s", round, i, w.Code, w.Body)
			}
			if w.Code == 200 {
				wrote++
			}
		}
		stats, weekly, hidden := got[0].Code == 200, got[1].Code == 200, got[2].Code == 200
		row := scalar(t, e, `SELECT show_profile_stats::text || ' ' || show_weekly_performance::text || ' ' || hidden_from_directory::text || ' ' || revision::text FROM players WHERE id = $1`, aliceID)
		want := strings.Join([]string{boolWord(stats, "true", "false"), boolWord(weekly, "false", "true"), boolWord(hidden, "true", "false"), itoa(3 + wrote)}, " ")
		if row != want {
			t.Fatalf("round %d: row %q, want %q (answers %d %d %d)", round, row, want, got[0].Code, got[1].Code, got[2].Code)
		}
		if wrote == 0 {
			t.Fatalf("round %d: nobody won", round)
		}
	}
}

func boolWord(ok bool, yes, no string) string {
	if ok {
		return yes
	}
	return no
}

func itoa(n int) string { return string(rune('0' + n)) }

// Two different levels sent together: each answer is 200 or 409, the revision went up once for each 200, and the level is one a
// 200 asked for (the writes of a changed level take no lock).
func TestRaceOfTwoVisibilityLevels(t *testing.T) {
	e := fresh(t)
	for round := 0; round < 12; round++ {
		e.Reseed(t, writetest.ReadSeed(t, "testdata", "player.seed.sql"), nil)
		pass := e.PlayerPass(t, alice) // public, revision 3
		got := e.DoAll([]writetest.Request{
			{Method: "POST", Path: "/api/me/profile-visibility", App: "player", Bearer: pass, Body: `{"profileVisibility":"private","expectedRevision":"3"}`},
			{Method: "POST", Path: "/api/me/profile-visibility", App: "player", Bearer: pass, Body: `{"profileVisibility":"always_private","expectedRevision":"3"}`},
		})
		ok, conflict := statuses(got)
		if ok == 0 || ok+conflict != 2 {
			t.Fatalf("round %d: %d %d", round, got[0].Code, got[1].Code)
		}
		row := scalar(t, e, `SELECT profile_visibility::text || ' ' || revision::text FROM players WHERE id = $1`, aliceID)
		valid := map[string]bool{}
		for i, level := range []string{"private", "always_private"} {
			if got[i].Code == 200 {
				valid[level+" "+itoa(3+ok)] = true
			}
		}
		if !valid[row] {
			t.Fatalf("round %d: row %q after answers %d %d", round, row, got[0].Code, got[1].Code)
		}
	}
}

// Two equal writes sent together both answer 200 (the second finds the value already set, or writes it again): the revision
// is 4 or 5.
func TestRaceOfTwoEqualPhoneWrites(t *testing.T) {
	e := fresh(t)
	for round := 0; round < 10; round++ {
		e.Reseed(t, writetest.ReadSeed(t, "testdata", "player.seed.sql"), nil)
		pass := e.PlayerPass(t, alice)
		body := `{"phoneHidden":true,"expectedRevision":"3"}`
		got := e.DoAll([]writetest.Request{
			{Method: "POST", Path: "/api/me/phone-privacy", App: "player", Bearer: pass, Body: body},
			{Method: "POST", Path: "/api/me/phone-privacy", App: "player", Bearer: pass, Body: body},
		})
		if got[0].Code != 200 || got[1].Code != 200 {
			t.Fatalf("round %d: %d %d", round, got[0].Code, got[1].Code)
		}
		if row := scalar(t, e, `SELECT hide_phone_from_clubs::text || revision::text FROM players WHERE id = $1`, aliceID); row != "true4" && row != "true5" {
			t.Fatalf("round %d: row %q", round, row)
		}
	}
}

// Two creates of one command sent together answer one request: both 201 with the same ID, or 201 and 409 (the loser lost the
// unique command). Never two rows.
func TestRaceOfTwoCreatesOfOneCommand(t *testing.T) {
	e := fresh(t)
	for round := 0; round < 12; round++ {
		e.Reseed(t, writetest.ReadSeed(t, "testdata", "player.seed.sql"), nil)
		pass := e.PlayerPass(t, bob)
		body := `{"commandId":"c5000000-0000-4000-8000-000000000001","field":"email","value":"bob.new@example.test"}`
		got := e.DoAll([]writetest.Request{
			{Method: "POST", Path: "/api/account/contact-change", App: "player", Bearer: pass, Body: body},
			{Method: "POST", Path: "/api/account/contact-change", App: "player", Bearer: pass, Body: body},
		})
		ok, conflict := statuses(got)
		if ok+conflict != 2 || ok == 0 {
			t.Fatalf("round %d: %d %d", round, got[0].Code, got[1].Code)
		}
		if ok == 2 && got[0].Body.String() != got[1].Body.String() {
			t.Fatalf("round %d: two answers for one request: %s %s", round, got[0].Body, got[1].Body)
		}
		if n := scalar(t, e, `SELECT count(*)::text FROM player_contact_change_requests WHERE source_command_id = 'c5000000-0000-4000-8000-000000000001'`); n != "1" {
			t.Fatalf("round %d: %s rows", round, n)
		}
	}
}

// Two players asking for one value at once: a pending request reserves nothing, so both are made.
func TestRaceOfTwoPlayersAskingForOneValue(t *testing.T) {
	e := fresh(t)
	got := e.DoAll([]writetest.Request{
		{Method: "POST", Path: "/api/account/contact-change", App: "player", Bearer: e.PlayerPass(t, bob), Body: `{"commandId":"c5000000-0000-4000-8000-000000000001","field":"email","value":"shared@example.test"}`},
		{Method: "POST", Path: "/api/account/contact-change", App: "player", Bearer: e.PlayerPass(t, dan), Body: `{"commandId":"c5000000-0000-4000-8000-000000000002","field":"email","value":"shared@example.test"}`},
	})
	if got[0].Code != 201 || got[1].Code != 201 {
		t.Errorf("%d %s / %d %s", got[0].Code, got[0].Body, got[1].Code, got[1].Body)
	}
}

// Two players joining one club at once each get a row; one player joining twice gets one (the loser of the unique index is
// "already joined").
func TestRaceOfJoins(t *testing.T) {
	e := fresh(t)
	join := func(who string) writetest.Request {
		return writetest.Request{Method: "POST", Path: "/api/me/clubs", App: "player", Bearer: e.PlayerPass(t, who), Body: `{"clubId":"c9000000-0000-4000-8000-000000000002","inviteCode":"BIRDIE2026"}`}
	}
	for round := 0; round < 8; round++ {
		e.Reseed(t, writetest.ReadSeed(t, "testdata", "player.seed.sql"), nil)
		got := e.DoAll([]writetest.Request{join(bob), join(bob), join(hal), join(hal), join(alice)})
		for i, w := range got {
			if w.Code != 200 {
				t.Fatalf("round %d request %d: %d %s", round, i, w.Code, w.Body)
			}
		}
		if n := scalar(t, e, `SELECT count(*)::text FROM club_players WHERE club_id = 'c9000000-0000-4000-8000-000000000002' AND removed_at IS NULL`); n != "3" {
			t.Fatalf("round %d: %s members, want Bob, Hal and Alice (Dan left, so he is not counted)", round, n)
		}
	}
}

// What an answer says about the player in the path of a notification: the ID in the body is compared as typed.
func TestNotificationOwnerIsComparedAsTyped(t *testing.T) {
	e := fresh(t)
	for _, id := range []string{strings.ToUpper(danID), " " + danID, danID + " ", ""} {
		body, _ := json.Marshal(map[string]string{"playerId": id})
		if w := send(e, t, dan, "PATCH", "/api/me/notifications", string(body)); w.Code != 404 {
			t.Errorf("player ID %q: %d", id, w.Code)
		}
	}
}

// A request to a revision beyond a double stays exact in the revision check.
func TestBigRevisionIsExact(t *testing.T) {
	e := fresh(t)
	if w := send(e, t, bob, "POST", "/api/me/phone-privacy", `{"phoneHidden":false,"expectedRevision":"`+bobRev+`"}`); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if got := scalar(t, e, `SELECT revision::text FROM players WHERE id = 'd4000000-0000-4000-8000-000000000002'`); got != "9007199254740994" {
		t.Errorf("revision %s", got)
	}
}
