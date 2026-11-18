package fields

import "strings"

// isJSSpace is the set shared by JavaScript's trim() and /\s/: white space plus line terminators. It is not
// unicode.IsSpace: JavaScript counts U+FEFF and does not count U+0085. (Copied from internal/publicreads, which
// keeps its own unexported copy.)
func isJSSpace(r rune) bool {
	switch {
	case r >= '\t' && r <= '\r', r == ' ', r == 0xa0, r == 0x1680, r >= 0x2000 && r <= 0x200a,
		r == 0x2028, r == 0x2029, r == 0x202f, r == 0x205f, r == 0x3000, r == 0xfeff:
		return true
	}
	return false
}

// IsJSSpace reports whether r is white space to JavaScript.
func IsJSSpace(r rune) bool { return isJSSpace(r) }

// JSTrim is String.prototype.trim.
func JSTrim(s string) string { return strings.TrimFunc(s, isJSSpace) }

// MaskPhone is maskPhone in claim.ts: '+63 918 ••• ••77' (country code, first three digits, last two). e164 is
// the stored number, so ASCII digits; the JavaScript slice semantics (negative ends count from the back) are
// kept for numbers shorter than ten digits.
func MaskPhone(e164 string) string {
	digits := strings.TrimPrefix(e164, "+")
	country := slice(digits, 0, len(digits)-10)
	if country == "" {
		country = slice(digits, 0, 2)
	}
	rest := digits[len(country):]
	return "+" + country + " " + slice(rest, 0, 3) + " ••• ••" + lastTwo(rest)
}

// slice is s.slice(start, end) for an ASCII string and start >= 0: a negative end counts from the back.
func slice(s string, start, end int) string {
	if end < 0 {
		end = max(len(s)+end, 0)
	}
	end = min(end, len(s))
	if start >= end {
		return ""
	}
	return s[start:end]
}

func lastTwo(s string) string {
	if len(s) <= 2 {
		return s
	}
	return s[len(s)-2:]
}

// FirstName is firstNameOf in claim.ts: the nickname when it is not empty, else the full name up to its first
// single space (String.split(' ')[0]), else the full name when that is empty.
func FirstName(fullName string, nickname *string) string {
	if nickname != nil && *nickname != "" {
		return *nickname
	}
	if first, _, _ := strings.Cut(fullName, " "); first != "" {
		return first
	}
	return fullName
}
