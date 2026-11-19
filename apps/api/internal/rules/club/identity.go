package club

import (
	"strings"
	"unicode"

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
