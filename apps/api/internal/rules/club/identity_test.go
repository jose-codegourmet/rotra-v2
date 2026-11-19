package club_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Ported from packages/data/src/club/club.rules.test.ts: 'compares names and usernames ignoring case, accents and
// outer spaces' (one Vitest case, three expectations), plus the JavaScript trim set.
func TestPlainIdentity(t *testing.T) {
	if club.PlainIdentity(" Lahúg Smash CLUB ") != club.PlainIdentity("lahug smash club") {
		t.Error("case, accents and outer spaces must not matter")
	}
	for in, want := range map[string]string{
		"LAHUG.SMASH":        "lahug.smash",
		"Iñigo":              "inigo",
		"\ufeff Name \u00a0": "name",       // U+FEFF and NBSP are JavaScript white space
		"\u0085Name":         "\u0085name", // U+0085 is not
		"Ünï Cödé":           "uni code",
		"á":                 "a", // an already decomposed accent
		"İ":                  "i", // U+0130 decomposes to I and a dot above, which is dropped
		"":                   "",
	} {
		if got := club.PlainIdentity(in); got != want {
			t.Errorf("PlainIdentity(%q) = %q, want %q", in, got, want)
		}
	}
}
