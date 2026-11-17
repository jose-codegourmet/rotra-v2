package fields_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// maskPhone in packages/db/src/player/claim.ts: '+63 918 ••• ••77' (U+2022 dots).
func TestMaskPhone(t *testing.T) {
	const dots = "\u2022\u2022\u2022 \u2022\u2022"
	for in, want := range map[string]string{
		"+639185550177": "+63 918 " + dots + "77",
		"+12025550142":  "+1 202 " + dots + "42",
		"+6591234567":   "+65 912 " + dots + "67",
		"+44":           "+44  " + dots, // too short for ten digits: the first two are the country, nothing is left
	} {
		if got := fields.MaskPhone(in); got != want {
			t.Errorf("%q: %q, want %q", in, got, want)
		}
	}
}

// firstNameOf in claim.ts: the nickname, else the full name up to its first single space, else the full name.
func TestFirstName(t *testing.T) {
	cases := []struct {
		full     string
		nickname *string
		want     string
	}{
		{"Ana Reyes", nil, "Ana"},
		{"Ana Reyes", ptr("Nana"), "Nana"},
		{"Ana Reyes", ptr(""), "Ana"},
		{"Ana", nil, "Ana"},
		{" Ana Reyes", nil, " Ana Reyes"}, // split(' ')[0] is '', so the full name
		{"Ana  Reyes", nil, "Ana"},
		{"Ana\tReyes", nil, "Ana\tReyes"}, // only a space splits
	}
	for _, c := range cases {
		if got := fields.FirstName(c.full, c.nickname); got != c.want {
			t.Errorf("%q %v: %q, want %q", c.full, c.nickname, got, c.want)
		}
	}
}

func ptr(s string) *string { return &s }

func TestJSTrim(t *testing.T) {
	for in, want := range map[string]string{
		"  a  ": "a", "\ufeffa ": "a", " a　": "a", "a b": "a b",
		"\u0085a": "\u0085a", // U+0085 is not JavaScript white space
	} {
		if got := fields.JSTrim(in); got != want {
			t.Errorf("%q: %q, want %q", in, got, want)
		}
	}
}
