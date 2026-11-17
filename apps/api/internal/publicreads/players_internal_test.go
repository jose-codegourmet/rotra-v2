package publicreads

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestClubInitialsMatchTheTypeScriptSplitSliceMapJoin(t *testing.T) {
	// initials(): name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
	cases := []struct {
		name string
		want string // the decoded value
	}{
		{"Smash Club", "SC"},
		{"solo", "S"},
		{"  leading and   trailing  ", "LA"},
		{"Dink\U000000a0Squad  League", "DS"}, // NBSP is \s
		{"\U0000feffEcho Club", "EC"},         // U+FEFF is \s
		{"Zo\U000000eb \U000000c5ngstr\U000000f6m Club", "Z\U000000c5"},
		{"\U000000dfeta Smash", "SSS"}, // the sharp s upper-cases to SS
		{"\U0000fb01sh bar", "FIB"},    // the fi ligature upper-cases to FI
		{"a\tb\nc", "AB"},              // tab and newline split too
		{"", ""},
		{"   \t ", ""},
		{"x\U00000085y", "X"}, // U+0085 is not \s in JavaScript, so this is one word
	}
	for _, c := range cases {
		raw, err := json.Marshal(clubInitials(c.name))
		if err != nil {
			t.Fatalf("%q: %v", c.name, err)
		}
		var got string
		if err := json.Unmarshal(raw, &got); err != nil || got != c.want {
			t.Errorf("clubInitials(%q) = %s, want %q", c.name, raw, c.want)
		}
	}
}

func TestClubInitialsKeepAHalfSurrogateOnTheWire(t *testing.T) {
	// w[0] of an emoji is its high surrogate alone; JSON.stringify writes it as an escape, never U+FFFD.
	for in, want := range map[string]string{
		"\U0001F600 Birdie Club": `"\ud83dB"`,
		"\U0001F600":             `"\ud83d"`,
		"Smash \U0001F600":       `"S\ud83d"`,
	} {
		raw, err := json.Marshal(clubInitials(in))
		if err != nil || string(raw) != want {
			t.Errorf("clubInitials(%q) = %s (%v), want %s", in, raw, err, want)
		}
	}
	// a string with quotes and control characters still comes out as valid JSON text
	raw, err := json.Marshal(utf16String{'"', '\\', 0x0a, 0x01, 'a'})
	if err != nil || string(raw) != `"\"\\\n\u0001a"` {
		t.Errorf("escaping: %s (%v)", raw, err)
	}
}

func TestRTRLookupKeyIsTrimThenUpperCase(t *testing.T) {
	for in, want := range map[string]string{
		"rtr-ph-ceb-102926-0001":                     "RTR-PH-CEB-102926-0001",
		"  RTR-PH-CEB-102926-0001\t":                 "RTR-PH-CEB-102926-0001",
		"\U000000a0rtr-ph-ceb-102926-0001\U00003000": "RTR-PH-CEB-102926-0001",
		"rtr-ph-ce\U000000df":                        "RTR-PH-CESS", // the sharp s upper-cases to SS in JavaScript
		"\U0000fb00":                                 "FF",
		"\U0000fb03":                                 "FFI",
		"":                                           "",
		"\U00000131":                                 "I", // dotless i
	} {
		if got := rtrLookupKey(in); got != want {
			t.Errorf("rtrLookupKey(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestCurrentExperienceMonths(t *testing.T) {
	at := func(s string) pgtype.Timestamptz {
		ts, err := time.Parse(time.RFC3339, s)
		if err != nil {
			t.Fatal(err)
		}
		return pgtype.Timestamptz{Time: ts, Valid: true}
	}
	months := func(n int32) pgtype.Int4 { return pgtype.Int4{Int32: n, Valid: true} }
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	for _, c := range []struct {
		name     string
		months   pgtype.Int4
		recorded pgtype.Timestamptz
		want     int64
		wantOK   bool
	}{
		{"none", pgtype.Int4{}, pgtype.Timestamptz{}, 0, false},
		{"none even with a date", pgtype.Int4{}, at("2020-01-01T00:00:00Z"), 0, false},
		{"no date keeps the stored months", months(30), pgtype.Timestamptz{}, 30, true},
		{"six calendar months on", months(30), at("2026-05-20T00:00:00Z"), 36, true},
		{"same month adds nothing", months(14), at("2026-11-02T00:00:00Z"), 14, true},
		{"the calendar month changes, not the day count", months(0), at("2025-12-31T23:59:59.999Z"), 11, true},
		{"a future date never subtracts", months(11), at("2027-01-15T00:00:00Z"), 11, true},
		{"years back", months(23), at("2020-01-15T00:00:00Z"), 105, true},
		{"UTC decides the month", months(1), pgtype.Timestamptz{Time: time.Date(2026, 10, 31, 23, 30, 0, 0, time.FixedZone("x", -2*3600)), Valid: true}, 1, true},
	} {
		got, ok := currentExperienceMonths(c.months, c.recorded, now)
		if got != c.want || ok != c.wantOK {
			t.Errorf("%s: got %d,%v want %d,%v", c.name, got, ok, c.want, c.wantOK)
		}
	}
}

func TestPlayingStyleOf(t *testing.T) {
	for in, want := range map[string]string{
		`{"playingStyle":"Aggressive"}`: "Aggressive",
		`{"playingStyle":""}`:           "",
		`{"playingStyle":5}`:            "",
		`{"playingStyle":null}`:         "",
		`{"other":"x"}`:                 "",
		`[]`:                            "",
		`["playingStyle"]`:              "",
		`null`:                          "",
		`"playingStyle"`:                "",
		``:                              "",
		`{"playingStyle":"a","playingStyle":"b"}`: "b",
		`not json`: "",
	} {
		if got := playingStyleOf([]byte(in)); got != want {
			t.Errorf("playingStyleOf(%s) = %q, want %q", in, got, want)
		}
	}
}
