package publicreads

import (
	"math"
	"math/big"
	"regexp"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf16"
	"unicode/utf8"
)

// The TypeScript routes lean on JavaScript itself for parsing and trimming: Number(), String.trim,
// slice(0, 100) by UTF-16 units and URLSearchParams. The Go routes must answer the same inputs the same
// way, so each of those is copied here with its JavaScript quirks (see jsconv_test.go).

// isJSSpace is the set shared by JavaScript's trim() and /\s/: white space plus line terminators.
// It is not unicode.IsSpace: JavaScript counts U+FEFF and does not count U+0085.
func isJSSpace(r rune) bool {
	switch {
	case r >= '\t' && r <= '\r', r == ' ', r == 0xa0, r == 0x1680, r >= 0x2000 && r <= 0x200a,
		r == 0x2028, r == 0x2029, r == 0x202f, r == 0x205f, r == 0x3000, r == 0xfeff:
		return true
	}
	return false
}

func jsTrim(s string) string { return strings.TrimFunc(s, isJSSpace) }

var decimalNumber = regexp.MustCompile(`^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$`)

// jsToNumber is Number(string): blank is 0, 0x/0o/0b literals (unsigned) parse, "Infinity" parses,
// anything else that is not a plain decimal is NaN.
func jsToNumber(s string) float64 {
	t := jsTrim(s)
	if t == "" {
		return 0
	}
	if len(t) > 2 && t[0] == '0' {
		base := 0
		switch t[1] {
		case 'x', 'X':
			base = 16
		case 'o', 'O':
			base = 8
		case 'b', 'B':
			base = 2
		}
		if base != 0 {
			return parseRadix(t[2:], base)
		}
	}
	switch t {
	case "Infinity", "+Infinity":
		return math.Inf(1)
	case "-Infinity":
		return math.Inf(-1)
	}
	if !decimalNumber.MatchString(t) {
		return math.NaN()
	}
	f, err := strconv.ParseFloat(t, 64)
	if err != nil && !math.IsInf(f, 0) {
		return math.NaN()
	}
	return f // an out-of-range value is ±Infinity, as in JavaScript
}

func parseRadix(digits string, base int) float64 {
	for _, c := range digits {
		var v int
		switch {
		case c >= '0' && c <= '9':
			v = int(c - '0')
		case c >= 'a' && c <= 'f':
			v = int(c-'a') + 10
		case c >= 'A' && c <= 'F':
			v = int(c-'A') + 10
		default:
			return math.NaN()
		}
		if v >= base {
			return math.NaN()
		}
	}
	n, ok := new(big.Int).SetString(digits, base)
	if !ok {
		return math.NaN()
	}
	f, _ := new(big.Float).SetInt(n).Float64()
	return f
}

// maskPublicName is maskPublicName in publicSession.rules.ts: each word keeps its first code point and
// gets "***"; no words reads "Player".
func maskPublicName(name string) string {
	words := strings.FieldsFunc(name, isJSSpace)
	if len(words) == 0 {
		return "Player"
	}
	masked := make([]string, len(words))
	for i, w := range words {
		first, _ := utf8.DecodeRuneInString(w)
		masked[i] = string(first) + "***"
	}
	return strings.Join(masked, " ")
}

// truncateUTF16 is s.slice(0, n): n UTF-16 units, not characters. A cut through a surrogate pair leaves
// a lone surrogate, which Node sends to Postgres as U+FFFD.
func truncateUTF16(s string, n int) string {
	if len(s) <= n { // a string never has more UTF-16 units than bytes
		return s
	}
	units := utf16.Encode([]rune(s))
	if len(units) <= n {
		return s
	}
	return string(utf16.Decode(units[:n]))
}

// queryValue is new URL(url).searchParams.get(key): the first value, '+' as a space, percent escapes
// decoded leniently (a bad escape stays as typed, unlike net/url, which drops the whole pair), and
// ';' an ordinary character. found is false when the key is absent.
func queryValue(rawQuery, key string) (value string, found bool) {
	for _, part := range strings.Split(rawQuery, "&") {
		if part == "" {
			continue
		}
		name, val, _ := strings.Cut(part, "=")
		if formDecode(name) == key {
			return formDecode(val), true
		}
	}
	return "", false
}

func formDecode(s string) string {
	s = strings.ReplaceAll(s, "+", " ")
	if !strings.Contains(s, "%") {
		return strings.ToValidUTF8(s, "�")
	}
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] == '%' && i+2 < len(s) && isHex(s[i+1]) && isHex(s[i+2]) {
			out = append(out, unhex(s[i+1])<<4|unhex(s[i+2]))
			i += 2
			continue
		}
		out = append(out, s[i])
	}
	return strings.ToValidUTF8(string(out), "�")
}

func isHex(c byte) bool {
	return c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F'
}

func unhex(c byte) byte {
	switch {
	case c >= '0' && c <= '9':
		return c - '0'
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10
	}
	return c - 'A' + 10
}

// jsToLower is String.prototype.toLowerCase for the cases where it differs from Go's simple case mapping: a
// dotted capital I becomes "i" and a combining dot, and a capital sigma at the end of a word becomes the final
// sigma. The search over names uses it so that both sides fold the same way.
func jsToLower(s string) string {
	if !strings.ContainsAny(s, "İΣ") {
		return strings.ToLower(s)
	}
	runes := []rune(s)
	var b strings.Builder
	for i, r := range runes {
		switch r {
		case 'İ':
			b.WriteString("i̇")
		case 'Σ':
			if i > 0 && unicode.IsLetter(runes[i-1]) && (i+1 >= len(runes) || !unicode.IsLetter(runes[i+1])) {
				b.WriteRune('ς')
			} else {
				b.WriteRune('σ')
			}
		default:
			b.WriteRune(unicode.ToLower(r))
		}
	}
	return b.String()
}
