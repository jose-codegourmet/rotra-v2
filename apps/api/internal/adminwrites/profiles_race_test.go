package adminwrites_test

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Races whose winner is not decided, so the golden file cannot pin them: what always holds is checked here, many
// times over. The library lock lets one write in at a time, so the minimum shown is never broken and the default
// is never two rows.

// profilesEnv is a test environment on testdata/profiles.seed.sql; reset puts it back to the seed and the scenario.
func profilesEnv(t *testing.T) (e *writetest.Env, reset func(scenario string)) {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "profiles.cases.json", &cf)
	e = writetest.NewEnv(t, cf.Now, build)
	seed := writetest.ReadSeed(t, "testdata", cf.Seed)
	return e, func(scenario string) { e.Reseed(t, seed, cf.Scenarios[scenario]) }
}

func profileRequests(e *writetest.Env, t *testing.T, method, suffix string, ids ...string) []*httptest.ResponseRecorder {
	t.Helper()
	reqs := make([]writetest.Request, len(ids))
	for i, id := range ids {
		body := ""
		if method == "PATCH" {
			body = `{"shown":false}`
		}
		reqs[i] = writetest.Request{Method: method, Path: id + suffix, App: "admin", Bearer: e.AdminPass(t, owner), Body: body}
	}
	return e.DoAll(reqs)
}

func codes(got []*httptest.ResponseRecorder) (ok, conflict int) {
	for _, w := range got {
		switch w.Code {
		case 200:
			ok++
		case 409:
			conflict++
		}
	}
	return ok, conflict
}

const (
	bannersPath    = "/api/profile-banners/"
	charactersPath = "/api/profile-characters/"
	upload1        = "b1000000-0000-4000-8000-000000000001"
)

// Three hides of three shown banners when four are shown: two go through and the third is refused, in any order.
func TestRaceOfHidesNeverBreaksTheBannerMinimum(t *testing.T) {
	e, reset := profilesEnv(t)
	for round := 0; round < 12; round++ {
		reset("base")
		got := profileRequests(e, t, "PATCH", "", bannersPath+"night", bannersPath+"dusk", bannersPath+upload1)
		if ok, conflict := codes(got); ok != 2 || conflict != 1 {
			t.Fatalf("round %d: %d changed, %d refused", round, ok, conflict)
		}
		if n := count(t, e, `SELECT count(*) FROM profile_banners WHERE shown AND deleted_at IS NULL`); n != 2 {
			t.Fatalf("round %d: %d banners shown", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'profile_banner.hidden'`); n != 2 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// Two deletes of two different shown banners when three are shown: one goes, the other is refused.
func TestRaceOfDeletesNeverBreaksTheBannerMinimum(t *testing.T) {
	e, reset := profilesEnv(t)
	for round := 0; round < 12; round++ {
		reset("three_shown")
		got := profileRequests(e, t, "DELETE", "", bannersPath+"night", bannersPath+"dusk")
		if ok, conflict := codes(got); ok != 1 || conflict != 1 {
			t.Fatalf("round %d: %d deleted, %d refused", round, ok, conflict)
		}
		if n := count(t, e, `SELECT count(*) FROM profile_banners WHERE shown AND deleted_at IS NULL`); n != 2 {
			t.Fatalf("round %d: %d banners shown", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'profile_banner.deleted'`); n != 1 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// Two different banners made the default at once: both answer, one default stays, and the answers chain: one saw
// Court as the previous default, the other saw the first one's banner.
func TestRaceOfTwoDefaultsLeavesOne(t *testing.T) {
	e, reset := profilesEnv(t)
	for round := 0; round < 12; round++ {
		reset("base")
		got := profileRequests(e, t, "POST", "/default", bannersPath+"night", bannersPath+"dusk")
		if ok, _ := codes(got); ok != 2 {
			t.Fatalf("round %d: %d %s / %d %s", round, got[0].Code, got[0].Body, got[1].Code, got[1].Body)
		}
		if n := count(t, e, `SELECT count(*) FROM profile_banners WHERE is_default`); n != 1 {
			t.Fatalf("round %d: %d defaults", round, n)
		}
		previous := map[string]string{} // banner id -> the previous default it reported
		for _, w := range got {
			var b struct {
				Banner     struct{ ID string }
				PreviousID string
			}
			if err := json.Unmarshal(w.Body.Bytes(), &b); err != nil {
				t.Fatal(err)
			}
			previous[b.Banner.ID] = b.PreviousID
		}
		first, second := "night", "dusk"
		if previous["night"] != "court" {
			first, second = "dusk", "night"
		}
		if previous[first] != "court" || previous[second] != first {
			t.Fatalf("round %d: previous defaults %v", round, previous)
		}
		if n := count(t, e, `SELECT count(*) FROM profile_banners WHERE is_default AND id = $1`, second); n != 1 {
			t.Fatalf("round %d: the default is not the one that ran last (%s)", round, second)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'profile_banner.default_set'`); n != 2 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// Making a banner the default while another write hides it: either the hide runs first and Make default is refused
// (the banner is hidden), or Make default runs first and the hide is refused (the banner is the default). Never both.
func TestRaceOfMakeDefaultAndHide(t *testing.T) {
	e, reset := profilesEnv(t)
	for round := 0; round < 12; round++ {
		reset("base")
		reqs := []writetest.Request{
			{Method: "POST", Path: bannersPath + "night/default", App: "admin", Bearer: e.AdminPass(t, owner)},
			{Method: "PATCH", Path: bannersPath + "night", App: "admin", Bearer: e.AdminPass(t, owner), Body: `{"shown":false}`},
		}
		got := e.DoAll(reqs)
		if ok, conflict := codes(got); ok != 1 || conflict != 1 {
			t.Fatalf("round %d: %d %s / %d %s", round, got[0].Code, got[0].Body, got[1].Code, got[1].Body)
		}
		if n := count(t, e, `SELECT count(*) FROM profile_banners WHERE is_default AND NOT shown`); n != 0 {
			t.Fatalf("round %d: a hidden banner is the default", round)
		}
	}
}

// Five hides of five shown images when 18 are shown: three go through (down to the 15), two are refused.
func TestRaceOfHidesNeverBreaksTheCharacterMinimum(t *testing.T) {
	e, reset := profilesEnv(t)
	for round := 0; round < 12; round++ {
		reset("base")
		got := profileRequests(e, t, "PATCH", "", charactersPath+"_", charactersPath+"a", charactersPath+"b", charactersPath+"c", charactersPath+"d")
		if ok, conflict := codes(got); ok != 3 || conflict != 2 {
			t.Fatalf("round %d: %d changed, %d refused", round, ok, conflict)
		}
		if n := count(t, e, `SELECT count(*) FROM profile_characters WHERE shown AND deleted_at IS NULL`); n != 15 {
			t.Fatalf("round %d: %d images shown", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'profile_character.hidden'`); n != 3 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// A delete and a restore of the same banner at once: whichever runs first, the rows and the events agree (the
// banner is deleted exactly when the last event says so).
func TestRaceOfDeleteAndRestoreOfOneBanner(t *testing.T) {
	e, reset := profilesEnv(t)
	for round := 0; round < 12; round++ {
		reset("base")
		got := e.DoAll([]writetest.Request{
			{Method: "DELETE", Path: bannersPath + "ember", App: "admin", Bearer: e.AdminPass(t, owner)},
			{Method: "POST", Path: bannersPath + "ember/restore", App: "admin", Bearer: e.AdminPass(t, owner)},
		})
		deleted := count(t, e, `SELECT count(*) FROM profile_banners WHERE id = 'ember' AND deleted_at IS NOT NULL`)
		events := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE target_id = 'ember'`)
		restored := got[1].Code == 200
		switch {
		case restored: // restore ran second: the delete went first, so two events and a live banner
			if deleted != 0 || events != 2 || got[0].Code != 200 {
				t.Fatalf("round %d: %d %s / %d %s, deleted %d, events %d", round, got[0].Code, got[0].Body, got[1].Code, got[1].Body, deleted, events)
			}
		default: // restore ran first and found it back: one event, a deleted banner
			if deleted != 1 || events != 1 || got[0].Code != 200 || !strings.Contains(got[1].Body.String(), "already back") {
				t.Fatalf("round %d: %d %s / %d %s, deleted %d, events %d", round, got[0].Code, got[0].Body, got[1].Code, got[1].Body, deleted, events)
			}
		}
	}
}

// Next answers PATCH and DELETE of /api/profile-banners/shown with 405 (that segment is the picker's static route,
// which only has GET). Go has no such route here, so "shown" is a banner id like any other and is not in the library:
// a logged deviation, pinned so a change shows.
func TestShownIsABannerIDHere(t *testing.T) {
	e, reset := profilesEnv(t)
	reset("base")
	for _, c := range []struct{ method, path string }{
		{"PATCH", bannersPath + "shown"}, {"DELETE", bannersPath + "shown"},
		{"PATCH", charactersPath + "shown"}, {"DELETE", charactersPath + "shown"},
	} {
		w := e.Do(writetest.Request{Method: c.method, Path: c.path, App: "admin", Bearer: e.AdminPass(t, owner), Body: `{"shown":false}`})
		if w.Code != 409 {
			t.Errorf("%s %s: %d %s", c.method, c.path, w.Code, w.Body)
		}
	}
}
