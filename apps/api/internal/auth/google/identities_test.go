package google_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// sharedEntry saves an email as an unclaimed person's shared entry (D-2026-11-16-04), with its RTR ID counter.
func (e *env) sharedEntry(t testing.TB, club uuid.UUID, email, rtr string) uuid.UUID {
	t.Helper()
	loc := e.location(t, "PH", "CEB")
	e.exec(t, `INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ($1, DATE '2026-11-17', 99) ON CONFLICT DO NOTHING`, loc)
	id := uuid.New()
	e.exec(t, `INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, created_at, updated_at)
	  VALUES ($1, $2, $3, $4, $5, 'PH', 'CEB', DATE '2026-11-17', $6, now(), now(), now())`, id, email, rtr, club, loc, e.seq.Add(1)+100)
	return id
}

// savedRecord is a club's record of that person: its own name, nickname, intake and the date the club saved it.
func (e *env) savedRecord(t testing.TB, club, entry uuid.UUID, name, nickname, phone, preset string, added time.Time) uuid.UUID {
	t.Helper()
	rec := uuid.New()
	var nick any
	if nickname != "" {
		nick = nickname
	}
	e.exec(t, `INSERT INTO club_players (id, club_id, display_name, nickname, shared_entry_id, added_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now())`, rec, club, name, nick, entry, added)
	if phone != "" || preset != "" {
		var p, ps any
		if phone != "" {
			p = phone
		}
		if preset != "" {
			ps = preset
		}
		e.exec(t, `INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, preset_fields, captured_at, state, updated_at) VALUES ($1, $2, $3, $4::jsonb, $5, 'pending', now())`, rec, club, p, ps, added)
	}
	return rec
}

func TestAnEmailClubsSavedShowsTheirIdentityCardsToTheGoogleAccountThatHoldsIt(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	first, second := e.club(t, "Lahug Smash Club"), e.club(t, "Cebu Birdie Club")
	entry := e.sharedEntry(t, first, "sam@example.test", "RTR-PH-CEB-111726-0042")
	// The second club saved them first, so its card comes first; one club per card, in the order the clubs saved them.
	e.savedRecord(t, second, entry, "Samuel Reyes", "Sam", "+639175550123", `{"playingStyle":"Net player","experienceMonths":30,"experienceRecordedAt":"`+base.Format(time.RFC3339)+`","socialLinks":{"facebook":"https://facebook.com/sam","instagram":"","youtube":"https://youtube.com/@sam","linkedin":""}}`, base.Add(-72*time.Hour))
	e.savedRecord(t, first, entry, "Sam R.", "", "", "", base.Add(-24*time.Hour))
	// Not shown: a removed record, a record that already joined an account, and another entry's.
	third := e.club(t, "Removed Club")
	gone := e.savedRecord(t, third, entry, "Gone", "", "", "", base.Add(-96*time.Hour))
	e.exec(t, `UPDATE club_players SET removed_at = now() WHERE id = $1`, gone)
	other := e.sharedEntry(t, first, "other@example.test", "RTR-PH-CEB-111726-0043")
	e.savedRecord(t, first, other, "Someone Else", "", "", "", base.Add(-96*time.Hour))

	b := e.browser()
	b.trip(t, "register", "invite", "/register/x", claims{"email": "SAM@example.test", "name": "Sam Google"})
	out := readOutcome(t, b)
	wantOutcome(t, out, obj{"outcome": "new-account"})
	cards := decode(t, out)["unclaimed"].(obj)
	if cards["email"] != "sam@example.test" || cards["rtrId"] != "RTR-PH-CEB-111726-0042" {
		t.Fatalf("%s", out.Body.String())
	}
	recs := cards["records"].([]any)
	if len(recs) != 2 {
		t.Fatalf("%d cards: %s", len(recs), out.Body.String())
	}
	a, c := recs[0].(obj), recs[1].(obj)
	if a["clubName"] != "Cebu Birdie Club" || a["clubInitials"] != "CB" || a["name"] != "Samuel Reyes" || a["nickname"] != "Sam" || a["picture"] != nil || a["clubLogoUrl"] != nil {
		t.Fatalf("first card %v", a)
	}
	if a["maskedPhone"] != "+63 917 ••• ••23" || a["playingStyle"] != "Net player" || a["saved"] != "Nov 20, 2026" || a["level"] != nil || a["games"] != float64(0) || a["sessions"] != float64(0) {
		t.Fatalf("first card %v", a)
	}
	if links := a["links"].([]any); len(links) != 2 || links[0] != "Facebook" || links[1] != "YouTube" {
		t.Fatalf("links %v", a["links"])
	}
	// 30 months of play before 2026-11-23 is May 2024.
	if a["playingSince"] != "May 2024" {
		t.Fatalf("playingSince %v", a["playingSince"])
	}
	if c["clubName"] != "Lahug Smash Club" || c["maskedPhone"] != nil || c["playingSince"] != nil || c["playingStyle"] != nil || len(c["links"].([]any)) != 0 || c["nickname"] != nil {
		t.Fatalf("second card %v", c)
	}
	// The same cards, to the page that asks for them with the held email, and only then.
	got := b.do(t, req{method: "GET", path: "/api/auth/google/unclaimed?email=" + "Sam@Example.test"})
	if got.Code != http.StatusOK || !strings.Contains(got.Body.String(), `"records"`) {
		t.Fatalf("%d %s", got.Code, got.Body.String())
	}
	if other := b.do(t, req{method: "GET", path: "/api/auth/google/unclaimed?email=other@example.test"}); other.Body.String() != `{"unclaimed":null}` {
		t.Fatalf("an email that is not the held one reveals nothing: %s", other.Body.String())
	}
}

func TestIdentityCardsAreNullForAClaimedRetiredOrEmptyEntry(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	claimed := e.sharedEntry(t, club, "claimed@example.test", "RTR-PH-CEB-111726-0050")
	e.savedRecord(t, club, claimed, "Claimed", "", "", "", base)
	playerID, _ := e.player(t, playerOpts{email: "someone@example.test"})
	e.exec(t, `UPDATE shared_player_entries SET claimed_player_id = $1, claimed_at = now(), email = NULL WHERE id = $2`, playerID, claimed)
	e.sharedEntry(t, club, "empty@example.test", "RTR-PH-CEB-111726-0052")

	for _, email := range []string{"claimed@example.test", "empty@example.test", "nobody@example.test"} {
		b := e.browser()
		b.trip(t, "register", "invite", "/register/x", claims{"email": email})
		out := readOutcome(t, b)
		if out.Code != http.StatusOK || decode(t, out)["unclaimed"] != nil {
			t.Errorf("%s: %s", email, out.Body.String())
		}
	}
}
