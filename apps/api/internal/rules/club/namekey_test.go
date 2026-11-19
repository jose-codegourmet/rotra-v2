package club_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Every row is what the Route Handler stored in clubs.name_key (clubs.golden.json): NFKC, JavaScript's trim and \s, and
// the full lower-casing of toLowerCase, which strings.ToLower is not.
func TestNameKeyMatchesWhatTheTypeScriptStored(t *testing.T) {
	for in, want := range map[string]string{
		"Banilad Birdies":                  "banilad birdies",
		"Ångström Club":                  "ångström club",
		"ﬁne Ｆｕｌｌ Club":                    "fine full club",
		"İstanbul Smash":                   "i̇stanbul smash",
		"ΣΊΣΥΦΟΣ Club":                     "σίσυφος club",
		"K Club":                           "k club",
		"ǅungla Club":                      "džungla club",
		"Straẞe Club":                      "straße club",
		"Ⅷ Club":                           "viii club",
		"  Spaced  Out\xef\xbb\xbf Club 　": "spaced out club",
		"\U0001F3F8 Smash":                 "\U0001F3F8 smash",
		"ΑΣΑ Club":                         "ασα club",
		"ΟΔΟΣ. Club":                       "οδος. club",
		"²½ Club":                          "21⁄2 club",
		"Å Club":                           "å club",
		"ſmash Club":                       "smash club",
		"Lahug   Smashers":                 "lahug smashers",
		"Ｌａｈｕｇ Smashers":                   "lahug smashers",
		"Lahu\u0301g Smashers":             "lah\u00fag smashers", // the accent composes: Lahúg is not Lahug
		"":                                 "",
		" \t\n ":                           "",
	} {
		if got := club.NameKey(in); got != want {
			t.Errorf("NameKey(%q) = %q, want %q", in, got, want)
		}
	}
}

// The username is trimmed and lower-cased as JavaScript does, but not normalized (clubs.golden.json).
func TestNormalizeUsernameMatchesWhatTheTypeScriptStored(t *testing.T) {
	for in, want := range map[string]string{
		"  Banilad.BIRDIES \t": "banilad.birdies",
		"ÑANDÚ":                "ñandú",
		"İZMİR":                "i̇zmi̇r",
		"ΣΊΣΥΦΟΣ":              "σίσυφος",
		" banilad ":            "banilad",
		"\xef\xbb\xbfx ":       "x",
		"ban ilad":             "ban ilad",
		"B@N!LAD+/X":           "b@n!lad+/x",
		"":                     "",
		"Ｂ":                    "ｂ", // full width is lower-cased, not normalized
	} {
		if got := club.NormalizeUsername(in); got != want {
			t.Errorf("NormalizeUsername(%q) = %q, want %q", in, got, want)
		}
	}
}
