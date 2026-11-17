package publicreads

import (
	"math"
	"strings"
	"testing"
)

// These helpers copy what the TypeScript routes get from JavaScript itself: Number(), String.trim,
// slice(0, 100) by UTF-16 units and URLSearchParams. The comments name the JS behavior each case pins.

func TestJSToNumberMatchesNumber(t *testing.T) {
	nan := math.NaN()
	cases := []struct {
		in   string
		want float64
	}{
		{"", 0}, {"   ", 0}, {"\t\n", 0}, {"0", 0}, {"-0", math.Copysign(0, -1)}, {"25", 25}, {"  25  ", 25},
		{"\u00a025\u3000", 25}, {"\ufeff7\ufeff", 7}, {"+5", 5}, {"-5", -5}, {"5.", 5}, {".5", 0.5}, {"2.0", 2},
		{"1e1", 10}, {"1E1", 10}, {"1e+1", 10}, {"1e-1", 0.1}, {"1e", nan}, {"e1", nan}, {".", nan}, {"+", nan},
		{"0x10", 16}, {"0X1f", 31}, {"0o17", 15}, {"0b101", 5}, {"-0x10", nan}, {"+0x10", nan}, {"0x", nan}, {"0xg", nan},
		{"0b2", nan}, {"0o8", nan}, {"1_000", nan}, {"1,5", nan}, {"abc", nan}, {"12abc", nan}, {"1 2", nan},
		{"Infinity", math.Inf(1)}, {"+Infinity", math.Inf(1)}, {"-Infinity", math.Inf(-1)}, {"infinity", nan}, {"Inf", nan},
		{"NaN", nan}, {"nan", nan}, {"1e999", math.Inf(1)}, {"-1e999", math.Inf(-1)}, {"1e20", 1e20}, {"9007199254740993", 9007199254740992},
		{"0x" + strings.Repeat("f", 20), 1.2089258196146292e24},
	}
	for _, c := range cases {
		got := jsToNumber(c.in)
		if math.IsNaN(c.want) != math.IsNaN(got) || (!math.IsNaN(c.want) && (got != c.want || math.Signbit(got) != math.Signbit(c.want))) {
			t.Errorf("Number(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestJSTrimUsesTheJavaScriptWhitespaceSet(t *testing.T) {
	ws := "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
	if got := jsTrim(ws + "a b" + ws); got != "a b" {
		t.Fatalf("trim = %q", got)
	}
	// NEL (U+0085) and the zero-width space (U+200B) are not JavaScript whitespace, though Go's unicode.IsSpace counts NEL.
	if got := jsTrim("\u0085a\u200b"); got != "\u0085a\u200b" {
		t.Fatalf("trim removed a non-whitespace character: %q", got)
	}
	if jsTrim("") != "" || jsTrim(ws) != "" {
		t.Fatal("all-whitespace must trim to empty")
	}
}

func TestMaskPublicNameMatchesTheTypeScriptRule(t *testing.T) {
	cases := map[string]string{
		"Maria Santos":       "M*** S***",
		"  Maria   Santos  ": "M*** S***",
		"Madonna":            "M***",
		"":                   "Player",
		"   ":                "Player",
		"\u00a0\ufeff":       "Player",
		"Élodie Ñandú":       "É*** Ñ***",
		"😀 Smile":            "😀*** S***",
		"a\u3000b\u2028c":    "a*** b*** c***",
		"x\u0085y":           "x***", // NEL does not split words in JavaScript
		"Ana-Marie O'Neil":   "A*** O***",
		"école":             "e***", // the first code point only, as Array.from does
	}
	for in, want := range cases {
		if got := maskPublicName(in); got != want {
			t.Errorf("maskPublicName(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestTruncateUTF16CutsLikeSlice(t *testing.T) {
	if got := truncateUTF16("short", 100); got != "short" {
		t.Fatal(got)
	}
	long := strings.Repeat("a", 150)
	if got := truncateUTF16(long, 100); len(got) != 100 {
		t.Fatalf("len %d", len(got))
	}
	// An emoji is two UTF-16 units: 99 letters plus an emoji is 101 units, so the cut splits the pair.
	// Node then sends the lone surrogate to Postgres as U+FFFD.
	split := strings.Repeat("a", 99) + "😀"
	if got := truncateUTF16(split, 100); got != strings.Repeat("a", 99)+"�" {
		t.Fatalf("split pair = %q", got)
	}
	whole := strings.Repeat("a", 98) + "😀"
	if got := truncateUTF16(whole, 100); got != whole {
		t.Fatalf("a pair that fits must stay whole, got %q", got)
	}
}

func TestQueryValueMatchesURLSearchParams(t *testing.T) {
	cases := []struct {
		raw, key, want string
		found          bool
	}{
		{"q=alice", "q", "alice", true},
		{"q=alice&q=bob", "q", "alice", true},
		{"a=1&q=x", "q", "x", true},
		{"q=bob+santos", "q", "bob santos", true},
		{"q=bob%20santos", "q", "bob santos", true},
		{"q=%2B", "q", "+", true},
		{"q=%C3%A9", "q", "é", true},
		{"q=%zz", "q", "%zz", true}, // a bad escape stays as typed; Go's net/url would drop the pair
		{"q=%4", "q", "%4", true},   // truncated escape stays as typed
		{"q=a;b", "q", "a;b", true}, // ';' is an ordinary character
		{"q", "q", "", true},        // no '=': present, empty
		{"q=", "q", "", true},
		{"q=a=b", "q", "a=b", true}, // only the first '=' splits
		{"&&q=1&&", "q", "1", true},
		{"%71=x", "q", "x", true}, // the name is decoded too
		{"", "q", "", false},
		{"p=1", "q", "", false},
		{"q=%ff", "q", "�", true}, // invalid UTF-8 decodes to the replacement character
	}
	for _, c := range cases {
		got, found := queryValue(c.raw, c.key)
		if got != c.want || found != c.found {
			t.Errorf("queryValue(%q, %q) = %q, %v; want %q, %v", c.raw, c.key, got, found, c.want, c.found)
		}
	}
}
