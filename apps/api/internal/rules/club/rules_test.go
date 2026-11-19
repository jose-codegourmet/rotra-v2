package club_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Ported from packages/data/src/club/club.rules.test.ts, describe('club identity rules'): 'takes the first letters of
// the first two words', 'counts a scheduled license as no license in the directory filter' and 'searches name,
// username, city, code and earlier names'. ('compares names and usernames...' is identity_test.go.)
func TestClubInitials(t *testing.T) {
	for in, want := range map[string]string{"Lahug Smashers": "LS", "  sampaloc   shuttle collective ": "SS", "Molo": "M", "   ": "C", "": "C", "école nord": "ÉN"} {
		if got := club.Initials(in); got != want {
			t.Errorf("Initials(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestAdminClubAccessFilter(t *testing.T) {
	for in, want := range map[string]string{"active": "active", "expired": "expired", "scheduled": "none", "none": "none"} {
		if got := club.AdminClubAccessFilter(in); got != want {
			t.Errorf("%s: %s", in, got)
		}
	}
}

func TestMatchesSearch(t *testing.T) {
	c := club.Searchable{Name: "Lahug Smashers", Username: "lahug.smash", City: "Cebu City", CityCode: "PH-CEB", EarlierNames: []string{"Lahug Smash Club"}}
	for q, want := range map[string]bool{"": true, "  ": true, "SMASHERS": true, "lahug.smash": true, "cebú": true, "ph-ceb": true, "smash club": true, "manila": false} {
		if got := club.MatchesSearch(c, q); got != want {
			t.Errorf("%q: %v, want %v", q, got, want)
		}
	}
}
