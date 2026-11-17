// Package fields holds the small field rules and text conversions the player endpoints share, ported from
// @rotra/schema (phone) and packages/db/src/player/claim.ts (maskPhone, firstNameOf).
package fields

import (
	"regexp"
	"strings"
)

var (
	typedPhone   = regexp.MustCompile(`^\+?[\d -]+$`)
	phNationalRE = regexp.MustCompile(`^(?:0|\+?63)9\d{9}$`)
)

// ParsePHMobile is phoneField in packages/schema/src/phone.ts: trim (JavaScript's trim), the characters must be
// digits, spaces, hyphens and an optional leading plus, spaces and hyphens are removed, and the rest must be a
// Philippine mobile (09, 639 or +639 then nine digits). It returns E.164 (+639...). ok is false otherwise.
func ParsePHMobile(s string) (e164 string, ok bool) {
	s = JSTrim(s)
	if !typedPhone.MatchString(s) {
		return "", false
	}
	s = strings.NewReplacer(" ", "", "-", "").Replace(s)
	if !phNationalRE.MatchString(s) {
		return "", false
	}
	if strings.HasPrefix(s, "0") {
		return "+63" + s[1:], true
	}
	return "+" + strings.TrimPrefix(s, "+"), true
}
