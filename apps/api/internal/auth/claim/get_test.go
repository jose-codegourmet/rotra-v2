package claim_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
)

const dots = "••• ••"

// P-CLAIM read (readClaimLink in packages/db/src/player/claim.ts): the same body as the Route Handler.
func TestGetRecordLink(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{name: "Ana Reyes", nickname: "Nana", phone: "+639185550177", email: "ana@club.test"})
	w := e.get(token)
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantJSON(t, w, obj{"link": obj{
		"status": "valid", "clubName": "Lahug Smash Club",
		"preview": obj{"playerId": nil, "fullName": "Ana Reyes", "nickname": "Nana", "rtrId": nil, "picture": nil, "maskedPhone": "+63 918 " + dots + "77"},
		"preset": obj{
			"fullName": "Ana Reyes", "nickname": "Nana", "email": "ana@club.test", "playingStyle": "",
			"experienceYears": "", "experienceMonths": "", "facebook": "", "instagram": "", "youtube": "", "linkedin": "",
		},
	}})
	if got := w.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Errorf("Cache-Control %q", got)
	}
	if got := w.Header().Get("Vary"); got != "Cookie" {
		t.Errorf("Vary %q", got)
	}
	if got := w.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type %q", got)
	}
}

// A record with no nickname, no input row and no phone: nickname null in the preview and ” in the preset, an
// empty masked phone, an empty email.
func TestGetRecordLinkWithoutContacts(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{noInput: true})
	w := e.get(token)
	wantJSON(t, w, obj{"link": obj{
		"status": "valid", "clubName": "Club",
		"preview": obj{"playerId": nil, "fullName": "Ana Reyes", "nickname": nil, "rtrId": nil, "picture": nil, "maskedPhone": ""},
		"preset": obj{
			"fullName": "Ana Reyes", "nickname": "", "email": "", "playingStyle": "",
			"experienceYears": "", "experienceMonths": "", "facebook": "", "instagram": "", "youtube": "", "linkedin": "",
		},
	}})
}

func TestGetPlayerLink(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Lahug Smash Club")
	// 20 months recorded 10 calendar months ago: 30 months today = 2 years 6 months
	token, id := e.playerLink(t, club, playerOpts{
		name: "Ben Cruz", nickname: "Benny", phone: "+639175550142", email: "ben@club.test", avatar: "https://example.test/ben.png",
		style: "baseline defender", expMonths: i32(20), expRecorded: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
		links: map[string]string{"facebook": "https://facebook.com/ben", "linkedin": "https://linkedin.com/in/ben"},
	})
	w := e.get(token)
	var rtr string
	if err := e.pool.QueryRow(e.ctx, `SELECT rtr_id FROM player_id_allocations WHERE player_id = $1`, id).Scan(&rtr); err != nil {
		t.Fatal(err)
	}
	wantJSON(t, w, obj{"link": obj{
		"status": "valid", "clubName": "Lahug Smash Club",
		"preview": obj{"playerId": id.String(), "fullName": "Ben Cruz", "nickname": "Benny", "rtrId": rtr, "picture": "https://example.test/ben.png", "maskedPhone": "+63 917 " + dots + "42"},
		"preset": obj{
			"fullName": "Ben Cruz", "nickname": "Benny", "email": "ben@club.test", "playingStyle": "baseline defender",
			"experienceYears": "2", "experienceMonths": "6",
			"facebook": "https://facebook.com/ben", "instagram": "", "youtube": "", "linkedin": "https://linkedin.com/in/ben",
		},
	}})
}

func TestGetPlayerLinkMinimal(t *testing.T) {
	e := newEnv(t)
	token, id := e.playerLink(t, e.club(t, "Club"), playerOpts{})
	var rtr string
	_ = e.pool.QueryRow(e.ctx, `SELECT rtr_id FROM player_id_allocations WHERE player_id = $1`, id).Scan(&rtr)
	wantJSON(t, e.get(token), obj{"link": obj{
		"status": "valid", "clubName": "Club",
		"preview": obj{"playerId": id.String(), "fullName": "Ben Cruz", "nickname": nil, "rtrId": rtr, "picture": nil, "maskedPhone": ""},
		"preset": obj{
			"fullName": "Ben Cruz", "nickname": "", "email": "", "playingStyle": "",
			"experienceYears": "", "experienceMonths": "", "facebook": "", "instagram": "", "youtube": "", "linkedin": "",
		},
	}})
}

// status: claimed when the link was used or the profile is claimed; expired when expires_at has passed (<= now,
// so the very instant counts); valid otherwise. A used link stays claimed after it would have expired.
func TestGetStatus(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	rec := func(o recordOpts) string { tok, _ := e.recordLink(t, club, o); return tok }
	ply := func(o playerOpts) string { tok, _ := e.playerLink(t, club, o); return tok }
	hour := time.Hour
	cases := map[string]struct{ token, before, at string }{
		"record valid":          {rec(recordOpts{}), "valid", "valid"},
		"record short":          {rec(recordOpts{expires: hour}), "valid", "expired"},
		"record consumed":       {rec(recordOpts{state: "consumed", expires: hour}), "claimed", "claimed"},
		"record already linked": {rec(recordOpts{linkedTo: e.playerOnly(t), expires: hour}), "claimed", "claimed"},
		"player valid":          {ply(playerOpts{}), "valid", "valid"},
		"player short":          {ply(playerOpts{expires: hour}), "valid", "expired"},
		"player consumed":       {ply(playerOpts{state: "consumed", expires: hour}), "claimed", "claimed"},
		"player claimed":        {ply(playerOpts{claimed: true, expires: hour}), "claimed", "claimed"},
	}
	status := func(token string) string {
		t.Helper()
		w := e.get(token)
		if w.Code != http.StatusOK {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		return decode(t, w).(obj)["link"].(obj)["status"].(string)
	}
	for name, c := range cases {
		if got := status(c.token); got != c.before {
			t.Errorf("%s before: %s, want %s", name, got, c.before)
		}
	}
	e.clk.Advance(hour - time.Second)
	for name, c := range cases {
		if got := status(c.token); got != c.before {
			t.Errorf("%s one second before expiry: %s, want %s", name, got, c.before)
		}
	}
	e.clk.Advance(time.Second) // now == expires_at
	for name, c := range cases {
		if got := status(c.token); got != c.at {
			t.Errorf("%s at expiry: %s, want %s", name, got, c.at)
		}
	}
}

// Unknown, revoked, a removed record, and a player link whose player has no RTR ID are all the same 404.
func TestGetNotFound(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	rec := func(o recordOpts) string { tok, _ := e.recordLink(t, club, o); return tok }
	ply := func(o playerOpts) string { tok, _ := e.playerLink(t, club, o); return tok }
	for _, token := range map[string]string{
		"unknown":          newToken(),
		"empty-looking":    "x",
		"revoked record":   rec(recordOpts{state: "revoked"}),
		"revoked player":   ply(playerOpts{state: "revoked"}),
		"removed record":   rec(recordOpts{removed: true}),
		"no RTR ID":        ply(playerOpts{noAllocation: true}),
		"a digest, not it": "AAAA",
	} {
		wantErr(t, e.get(token), http.StatusNotFound, "not_found", nil)
	}
}

// Only the Player app reads a claim link: another app, or none, is the catalog's 404, without counting against
// the public-read budget; a request without the proxy secret never reaches the route.
func TestGetNeedsThePlayerApp(t *testing.T) {
	e := newEnv(t, envOpts{readLimit: 2})
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{})
	ip := "203.0.113.9"
	for _, app := range []string{"club", "admin", "Player", "nonsense"} {
		w := e.get(token, fromIP(ip), func(r *req) { r.app = app })
		wantErr(t, w, http.StatusNotFound, "not_found", nil)
	}
	w := e.get(token, fromIP(ip), func(r *req) { r.noApp = true })
	wantErr(t, w, http.StatusNotFound, "not_found", nil)
	// none of that was counted: two good reads still fit the budget of two
	for i := 0; i < 2; i++ {
		if w := e.get(token, fromIP(ip)); w.Code != http.StatusOK {
			t.Fatalf("read %d: %d", i, w.Code)
		}
	}
	w = e.get(token, fromIP(ip))
	if w.Code != http.StatusTooManyRequests || w.Header().Get("Retry-After") == "" {
		t.Fatalf("%d %v", w.Code, w.Header())
	}
	wantJSON(t, w, obj{"error": obj{"code": "rate_limited", "message": "Too many requests. Try again in a minute."}})
	if w := e.get(token, func(r *req) { r.noSecret = true }); w.Code != http.StatusNotFound {
		t.Fatalf("no proxy secret: %d", w.Code)
	}
}

// playerOnly makes a bare player (for a record that is already linked).
func (e *env) playerOnly(t testing.TB) uuid.UUID {
	t.Helper()
	id := uuid.New()
	e.exec(t, `INSERT INTO players (id, full_name, updated_at) VALUES ($1, 'Linked', now())`, id)
	return id
}

// BL-14: the form's starting email is the record's shared entry's email first, then the intake's (recordPresetOf:
// sharedEntry?.email ?? privateInput?.email).
func TestGetRecordLinkPresetEmailPrefersTheSharedEntry(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Lahug Smash Club")
	for name, o := range map[string]struct {
		entryEmail, intakeEmail, want string
	}{
		"entry only":        {"entry@club.test", "", "entry@club.test"},
		"entry and intake":  {"entry2@club.test", "intake@club.test", "entry2@club.test"},
		"intake only":       {"", "intake@club.test", "intake@club.test"},
		"neither":           {"", "", ""},
		"closed entry/none": {"", "intake@club.test", "intake@club.test"},
	} {
		t.Run(name, func(t *testing.T) {
			token, rec := e.recordLink(t, club, recordOpts{name: "Ana Reyes", phone: "+639185550177", email: o.intakeEmail})
			if o.entryEmail != "" {
				entry := uuid.New()
				e.exec(t, `INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ($1, DATE '2026-11-17', 99) ON CONFLICT DO NOTHING`, e.location(t, "PH", "CEB"))
				e.exec(t, `INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, created_at, updated_at)
				  VALUES ($1, $2, $3, $4, $5, 'PH', 'CEB', DATE '2026-11-17', $6, now(), now(), now())`,
					entry, o.entryEmail, "RTR-PH-CEB-111726-"+pad4(int(e.seq.Add(1))), club, e.location(t, "PH", "CEB"), e.seq.Load())
				e.exec(t, `UPDATE club_players SET shared_entry_id = $1 WHERE id = $2`, entry, rec)
			}
			w := e.get(token)
			if w.Code != http.StatusOK {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			got := decode(t, w).(map[string]any)["link"].(map[string]any)["preset"].(map[string]any)["email"]
			if got != o.want {
				t.Fatalf("preset email %v, want %q", got, o.want)
			}
		})
	}
}

func pad4(n int) string {
	s := itoa(n)
	for len(s) < 4 {
		s = "0" + s
	}
	return s
}
