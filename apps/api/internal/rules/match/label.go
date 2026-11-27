package match

import (
	"slices"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// A match is named by who plays it (D-2026-11-19-07; matchCategory.rules.ts in @rotra/data): all men Men's, all women Women's,
// both sides the same mix of men and women Mixed, anything else Genderless, and any player whose gender isn't given makes it
// Genderless. The same rule for every format. A gender is "male", "female" or "" (not given).

// Category is matchCategory.
func Category(teamA, teamB []string) string {
	all := append(slices.Clone(teamA), teamB...)
	if len(all) == 0 {
		return "Genderless"
	}
	men, women := 0, 0
	for _, g := range all {
		switch g {
		case "male":
			men++
		case "female":
			women++
		default:
			return "Genderless"
		}
	}
	switch {
	case women == 0:
		return "Men's"
	case men == 0:
		return "Women's"
	}
	mixed := func(t []string) bool { return slices.Contains(t, "male") && slices.Contains(t, "female") }
	key := func(t []string) string {
		s := slices.Clone(t)
		slices.Sort(s)
		return strings.Join(s, ",")
	}
	if mixed(teamA) && mixed(teamB) && key(teamA) == key(teamB) {
		return "Mixed"
	}
	return "Genderless"
}

// formatLabels is FORMAT_LABELS.
var formatLabels = map[model.Format]string{
	"singles": "Singles", "doubles": "Doubles", "fun_1v2": "1v2 fun", "fun_3v3": "3v3 fun", "fun_4v4": "4v4 fun", "fun_5v5": "5v5 fun",
}

// Label is matchLabelOf: the category and the format, "Mixed Doubles". genderOf reads a roster player's gender ("" when not given or not
// on the roster).
func Label(format model.Format, teamA, teamB []string, genderOf func(id string) string) string {
	genders := func(ids []string) []string {
		out := make([]string, len(ids))
		for i, id := range ids {
			out[i] = genderOf(id)
		}
		return out
	}
	return Category(genders(teamA), genders(teamB)) + " " + formatLabels[format]
}
