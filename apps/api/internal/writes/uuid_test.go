package writes_test

import (
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// ParseUUID is Postgres's uuid input, which is how the services take an id Prisma hands on as text: braces, either case and a
// hyphen only after a group of four digits are all fine; anything else is refused (and crashes the TypeScript).
func TestParseUUID(t *testing.T) {
	const canonical = "c1000000-0000-4000-8000-000000000042"
	const digits = "c1000000000040008000000000000042"
	for _, s := range []string{canonical, strings.ToUpper(canonical), digits, "{" + canonical + "}", "c100-0000-0000-4000-8000-0000-0000-0042", "00000000-0000-0000-0000-000000000000"} {
		got, ok := writes.ParseUUID(s)
		if !ok || !got.Valid {
			t.Errorf("ParseUUID(%q) refused", s)
		}
	}
	if got, _ := writes.ParseUUID(canonical); got.Bytes[0] != 0xc1 || got.Bytes[15] != 0x42 {
		t.Errorf("bytes %x", got.Bytes)
	}
	for _, s := range []string{"", "x", " " + canonical, canonical + " ", "urn:uuid:" + canonical, "{" + canonical, canonical + "}", digits + "0", canonical[:35], "c1000000-0000-4000-8000-00000000004g", "c1000000-0-0-4000-8000-000000000042"} {
		if got, ok := writes.ParseUUID(s); ok || got.Valid {
			t.Errorf("ParseUUID(%q) accepted", s)
		}
	}
}
