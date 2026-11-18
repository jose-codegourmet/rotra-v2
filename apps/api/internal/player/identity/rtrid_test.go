package identity_test

import (
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
)

// rtrSyncDate in packages/db/src/player/rtr-id.ts: the day in Asia/Manila (checked against Node's Intl).
func TestSyncDate(t *testing.T) {
	for in, want := range map[string]string{
		"2026-11-13T16:30:00Z": "2026-11-14",
		"2026-11-13T15:59:59Z": "2026-11-13",
		"2026-12-31T16:00:00Z": "2027-01-01",
		"2026-12-31T15:59:59Z": "2026-12-31",
		"2026-01-01T00:00:00Z": "2026-01-01",
	} {
		at, err := time.Parse(time.RFC3339, in)
		if err != nil {
			t.Fatal(err)
		}
		if got := identity.SyncDate(at); got != want {
			t.Errorf("%s: %s, want %s", in, got, want)
		}
	}
}

// formatRtrId: RTR-<country>-<city>-<MMDDYY>-<sequence padded to four>, wider sequences not truncated.
func TestFormatRTRID(t *testing.T) {
	for _, c := range []struct {
		seq  int32
		want string
	}{
		{1, "RTR-PH-CEB-102926-0001"}, {42, "RTR-PH-CEB-102926-0042"}, {9999, "RTR-PH-CEB-102926-9999"}, {10000, "RTR-PH-CEB-102926-10000"},
	} {
		if got := identity.FormatRTRID("PH", "CEB", "2026-10-29", c.seq); got != c.want {
			t.Errorf("%d: %s, want %s", c.seq, got, c.want)
		}
	}
}
