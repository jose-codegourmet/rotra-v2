package adminwrites

import (
	"strings"
	"testing"
)

// pgUUID is Postgres's uuid input: the cases here include every command id form the flag capture sent to the real
// service (flags.cases.json, post_command_id_*): the ones Prisma and Postgres took and the ones that crashed.
func TestPGUUID(t *testing.T) {
	const canonical = "c1000000-0000-4000-8000-000000000042"
	const digits = "c1000000000040008000000000000042"
	accepted := []string{
		canonical, strings.ToUpper(canonical), digits, "{" + canonical + "}", "{" + digits + "}",
		"c1000000-0000-4000-8000-00000000-0042",     // hyphens after any group of four digits
		"c100-0000-0000-4000-8000-0000-0000-0042",   // after every group of four
		"c1000000-00004000-8000-000000000042",       // after some of them
		"00000000-0000-0000-0000-000000000000",      // the nil UUID
		"{c1000000-0000-4000-8000-000000000042}",    // braces
		"C1000000-0000-4000-8000-000000000042",      // mixed case
		"c1000000-0000-4000-8000-000000000042"[:36], // exactly 36
		"{c100-0000-0000-4000-8000-0000-0000-0042}", // braces and every hyphen
		"c1000000000040008000-000000000042",         // one hyphen, after a group of four
		strings.Repeat("a", 32), strings.Repeat("A", 4) + strings.Repeat("0", 28),
	}
	for _, s := range accepted {
		got, ok := pgUUID(s)
		if !ok || !got.Valid {
			t.Errorf("pgUUID(%q) refused", s)
			continue
		}
		if len(strings.ReplaceAll(strings.Trim(s, "{}"), "-", "")) != 32 {
			t.Errorf("test input %q has not 32 digits", s)
		}
	}
	if got, _ := pgUUID(canonical); got.Bytes[0] != 0xc1 || got.Bytes[15] != 0x42 || got.Bytes[8] != 0x80 {
		t.Errorf("bytes %x", got.Bytes)
	}
	for _, s := range []string{
		"", "not-a-uuid", " " + canonical + " ", canonical + " ", " " + canonical, "urn:uuid:" + canonical,
		"g1000000-0000-4000-8000-000000000042", "c1000000-0000-4000-8000-00000000004", // a digit short
		"c1000000-0000-4000-8000-0000000000420", // a digit too many
		"{" + canonical, canonical + "}", "{" + canonical + "}}", "{{" + canonical + "}",
		"c1000000-0000-4000-8000-000000000042-",  // a hyphen after the last group
		"c100000-00-0000-4000-8000-000000000042", // a hyphen inside a group
		"-c1000000-0000-4000-8000-000000000042", "c1000000--0000-4000-8000-000000000042",
		"c1000000-0000-4000-8000-00000000004é", "c1000000-0000-4000-8000-0000000000４２",
		"{}", "{", "}",
	} {
		if _, ok := pgUUID(s); ok {
			t.Errorf("pgUUID(%q) accepted", s)
		}
	}
}
