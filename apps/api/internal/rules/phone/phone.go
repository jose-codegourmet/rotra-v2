// Package phone holds the phone rules (Go-only, bucket 2): pure functions with no database, HTTP, clock or randomness. They
// are ported from packages/schema/src/phone.ts: a Philippine mobile as typed becomes E.164, a partly typed one is grouped
// for display, and a number is masked so a person can recognise it and not reuse it.
package phone

import (
	"regexp"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Parse is phoneField: PH mobiles starting 09, 639 or +639, with spaces and hyphens, as E.164 (+639...). ok is false for
// anything else; no country is guessed and nothing is cut.
func Parse(value string) (e164 string, ok bool) { return fields.ParsePHMobile(value) }

var (
	displayShape = regexp.MustCompile(`^(?:0\d{0,10}|\+?63\d{0,10})$`)
	localShape   = regexp.MustCompile(`^0\d{10}$`)
)

func compact(value string) string { return strings.NewReplacer(" ", "", "-", "").Replace(value) }

func join(parts ...string) string {
	var kept []string
	for _, p := range parts {
		if p != "" {
			kept = append(kept, p)
		}
	}
	return strings.Join(kept, " ")
}

func slice(s string, from, to int) string {
	if from > len(s) {
		return ""
	}
	return s[from:min(to, len(s))]
}

// FormatForDisplay is formatPhoneForDisplay: it groups complete or partly typed PH mobiles for display only and leaves
// other input unchanged.
func FormatForDisplay(value string) string {
	c := compact(value)
	if !displayShape.MatchString(c) {
		return value
	}
	if strings.HasPrefix(c, "0") {
		return join(slice(c, 0, 4), slice(c, 4, 7), slice(c, 7, len(c)))
	}
	digits := slice(strings.TrimPrefix(c, "+"), 2, len(c))
	return join("+63", slice(digits, 0, 3), slice(digits, 3, 6), slice(digits, 6, len(digits)))
}

// Mask is maskPhone: '+639185550377' (or 0918 555 0377, 63 918 555 0377) becomes '+63 918 ••• ••77'. Input with no digits
// is returned unchanged.
func Mask(value string) string {
	var b strings.Builder
	for _, r := range value {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	digits := b.String()
	if digits == "" {
		return value
	}
	if localShape.MatchString(digits) {
		digits = "63" + digits[1:]
	}
	country := slice(digits, 0, 2)
	if len(digits) > 10 {
		country = digits[:len(digits)-10]
	}
	rest := digits[len(country):]
	tail := rest
	if len(rest) > 2 {
		tail = rest[len(rest)-2:]
	}
	return "+" + country + " " + slice(rest, 0, 3) + " ••• ••" + tail
}
