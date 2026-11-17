package fields_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Ported from packages/schema/src/phone.test.ts (the same cases, same expectations).
func TestParsePHMobile(t *testing.T) {
	for _, in := range []string{"0917 555 0142", "+63 917 555 0142", "639175550142", "0917-555-0142"} {
		got, ok := fields.ParsePHMobile(in)
		if !ok || got != "+639175550142" {
			t.Errorf("%q: %q %v", in, got, ok)
		}
	}
	for _, in := range []string{"", "9175550142", "+1 917 555 0142", "0917555014", "091755501422", "text09175550142"} {
		if got, ok := fields.ParsePHMobile(in); ok {
			t.Errorf("%q must be rejected, got %q", in, got)
		}
	}
	// beyond the ported cases: trim is JavaScript's, spaces and hyphens are removed anywhere, other digits and
	// letters are not accepted, and the second regex is anchored at both ends
	for in, want := range map[string]string{
		"  0917 555 0142\n":     "+639175550142",
		"\ufeff09175550142":     "+639175550142",
		"+639175550142":         "+639175550142",
		"0-9-1-7 5-5-5 0-1-4-2": "+639175550142",
	} {
		if got, ok := fields.ParsePHMobile(in); !ok || got != want {
			t.Errorf("%q: %q %v, want %q", in, got, ok, want)
		}
	}
	for _, in := range []string{"0917 555 0142 x", "٠٩١٧٥٥٥٠١٤٢", "09175550142\u0085", "++639175550142", "0917.555.0142", "63 9175550142 1", "+0917555014"} {
		if got, ok := fields.ParsePHMobile(in); ok {
			t.Errorf("%q must be rejected, got %q", in, got)
		}
	}
}
