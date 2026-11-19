package phone_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/phone"
)

// Ported from packages/schema/src/phone.test.ts: "PH mobile parsing" (4 + 6 rows and the grouping case, whose
// phoneField.parse(formatPhoneForDisplay(...)) round trip is checked too) and "maskPhone" (5 rows and 1 case): 17 cases.
func TestParse(t *testing.T) {
	for _, in := range []string{"0917 555 0142", "+63 917 555 0142", "639175550142", "0917-555-0142"} {
		if got, ok := phone.Parse(in); !ok || got != "+639175550142" {
			t.Errorf("%q: %q %v", in, got, ok)
		}
	}
	for _, in := range []string{"", "9175550142", "+1 917 555 0142", "0917555014", "091755501422", "text09175550142"} {
		if got, ok := phone.Parse(in); ok {
			t.Errorf("%q must be rejected, got %q", in, got)
		}
	}
}

func TestFormatForDisplay(t *testing.T) {
	for in, want := range map[string]string{
		"09175":            "0917 5",
		"+639175550142":    "+63 917 555 0142",
		"jose@example.com": "jose@example.com",
		"0":                "0",
		"0917":             "0917",
		"091755":           "0917 55",
		"+63":              "+63",
		"+6391":            "+63 91",
		"6391755":          "+63 917 55",
		"+63 917-555 0142": "+63 917 555 0142",
		"09175550142 7":    "09175550142 7",
	} {
		if got := phone.FormatForDisplay(in); got != want {
			t.Errorf("%q: %q, want %q", in, got, want)
		}
	}
	if got, ok := phone.Parse(phone.FormatForDisplay("09175550142")); !ok || got != "+639175550142" {
		t.Errorf("the grouped form parses to the same identity: %q %v", got, ok)
	}
}

func TestMask(t *testing.T) {
	for _, in := range []string{"+639175550142", "+63 917 555 0142", "0917 555 0142", "09175550142", "63 917 555 0142"} {
		if got := phone.Mask(in); got != "+63 917 ••• ••42" {
			t.Errorf("%q: %q", in, got)
		}
	}
	for _, in := range []string{"", "jose@example.com"} {
		if got := phone.Mask(in); got != in {
			t.Errorf("%q must be returned unchanged: %q", in, got)
		}
	}
	for in, want := range map[string]string{"+12025550142": "+1 202 ••• ••42", "+44": "+44  ••• ••", "123": "+12 3 ••• ••3"} {
		if got := phone.Mask(in); got != want {
			t.Errorf("%q: %q, want %q", in, got, want)
		}
	}
}
