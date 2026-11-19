package club

import (
	"strings"
	"unicode"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"golang.org/x/text/unicode/norm"
)

// PlainIdentity is plainIdentity in club.rules.ts: it trims, takes the accents off and lowercases, so "Lahúg"
// matches "lahug". The trim is JavaScript's, not Go's: JavaScript counts U+FEFF as white space and not U+0085.
func PlainIdentity(value string) string {
	trimmed := strings.TrimFunc(value, isJSSpace)
	var b strings.Builder
	for _, r := range norm.NFD.String(trimmed) {
		if r >= 0x300 && r <= 0x36f {
			continue
		}
		b.WriteRune(unicode.ToLower(r))
	}
	return b.String()
}

// isJSSpace is the set shared by JavaScript's trim() and /\s/: white space plus line terminators.
func isJSSpace(r rune) bool {
	switch {
	case r >= '\t' && r <= '\r', r == ' ', r == 0xa0, r == 0x1680, r >= 0x2000 && r <= 0x200a,
		r == 0x2028, r == 0x2029, r == 0x202f, r == 0x205f, r == 0x3000, r == 0xfeff:
		return true
	}
	return false
}

// Yearly saving, price line and amount text of a club price (club.rules.ts, on a club record's own fields).

// Price is a club's license price as the club record stores it: whole centavos.
type Price struct {
	// LicensePricing is "paid" or "free".
	LicensePricing                          string
	LicenseMonthlyMinor, LicenseYearlyMinor int64
}

// YearlySavingPercentOf is yearlySavingPercent of club.rules.ts: the saving a club's price gives, or 0 for a club that
// has no monthly price to save on.
func YearlySavingPercentOf(p Price) float64 {
	if p.LicenseMonthlyMinor > 0 {
		return YearlySavingPercent(p.LicenseMonthlyMinor, p.LicenseYearlyMinor)
	}
	return 0
}

// FormatClubPriceLine is formatClubPriceLine of club.rules.ts: "₱1,500 a month · ₱15,000 a year (17% off)" or
// "Free (tester club)".
func FormatClubPriceLine(p Price) string {
	return FormatPriceLine(StoredPrice{Pricing: p.LicensePricing, MonthlyMinor: p.LicenseMonthlyMinor, YearlyMinor: p.LicenseYearlyMinor})
}

// FormatAmount is a recorded license amount: 0 is a free club's term.
func FormatAmount(minor int64) string {
	if minor == 0 {
		return "Free"
	}
	return FormatPeso(minor)
}

// Initials is clubInitials: the first letters of the first two words (upper case), and "C" when there are none.
// Case mapping is per letter (unicode.ToUpper), so JavaScript's special cases such as "ß" to "SS" are not ported.
func Initials(name string) string {
	var out []rune
	words := 0
	for _, w := range splitJSSpace(name) {
		if words == 2 {
			break
		}
		for _, r := range w {
			out = append(out, unicode.ToUpper(r))
			break
		}
		words++
	}
	if len(out) == 0 {
		return "C"
	}
	return string(out)
}

// splitJSSpace is split(/\s+/).filter(Boolean): the words between runs of JavaScript white space.
func splitJSSpace(s string) []string {
	return strings.FieldsFunc(s, isJSSpace)
}

// AdminClubAccessFilter is adminClubAccessFilter: a scheduled license has no access yet, so it counts as "none"; any
// other state (active, expired, none) is its own filter. The argument is the access state name.
func AdminClubAccessFilter(state string) string {
	if state == "scheduled" {
		return "none"
	}
	return state
}

// Searchable is what the directory search looks in.
type Searchable struct {
	Name, Username, City, CityCode string
	EarlierNames                   []string
}

// MatchesSearch is matchesClubSearch: the directory search over name, username, city, city code and earlier names,
// ignoring case and accents. An empty or white space query matches everything.
func MatchesSearch(c Searchable, q string) bool {
	needle := PlainIdentity(q)
	if needle == "" {
		return true
	}
	parts := append([]string{c.Name, c.Username, c.City, c.CityCode}, c.EarlierNames...)
	return strings.Contains(PlainIdentity(strings.Join(parts, " ")), needle)
}

// jsLower is String.prototype.toLowerCase: the full Unicode lower-casing with its special cases, so U+0130 (I with a dot
// above) becomes "i" and a combining dot, and a capital sigma at the end of a word becomes the final sigma. The
// simple mapping of strings.ToLower does neither. (A Caser keeps state, so each call makes its own.)
func jsLower(s string) string { return cases.Lower(language.Und).String(s) }

// NameKey is clubNameKey (admin/club-identity.ts): the comparison key behind the unique club name (clubs.name_key):
// NFKC, trimmed, inner white space collapsed to one space, lower-cased. Proposal only; the approved comparison is
// pending #245.
func NameKey(name string) string {
	var b strings.Builder
	space := false
	for _, r := range strings.TrimFunc(norm.NFKC.String(name), isJSSpace) {
		if isJSSpace(r) {
			space = true
			continue
		}
		if space {
			b.WriteByte(' ')
			space = false
		}
		b.WriteRune(r)
	}
	return jsLower(b.String())
}

// NormalizeUsername is normalizeClubUsername: a club's sign-in username, trimmed and lower-cased as JavaScript does
// (club_accounts.username).
func NormalizeUsername(username string) string { return jsLower(strings.TrimFunc(username, isJSSpace)) }
