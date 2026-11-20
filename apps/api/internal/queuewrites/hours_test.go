package queuewrites

import (
	"testing"
	"time"
)

// The expected texts are what node's Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute:
// '2-digit' }).formatRange gives after the notification's replaceAll calls (captured from the runtime, not written from
// memory): same period, across noon, across midnight, the same instant, a different day, and an end before the start.
func TestSessionHours(t *testing.T) {
	cases := []struct{ start, end, want, day string }{
		{"2026-11-19T01:00:00Z", "2026-11-19T05:00:00Z", "9:00 AM–1:00 PM", "Thu"},
		{"2026-11-19T01:00:00Z", "2026-11-19T03:30:00Z", "9:00–11:30 AM", "Thu"},
		{"2026-11-19T02:00:00Z", "2026-11-19T06:00:00Z", "10:00 AM–2:00 PM", "Thu"},
		{"2026-11-19T10:00:00Z", "2026-11-19T18:00:00Z", "11/19/2026, 6:00 PM–11/20/2026, 2:00 AM", "Thu"},
		{"2026-11-19T10:00:00Z", "2026-11-19T16:00:00Z", "11/19/2026, 6:00 PM–11/20/2026, 12:00 AM", "Thu"},
		{"2026-11-19T04:00:00Z", "2026-11-19T04:00:00Z", "12:00 PM", "Thu"},
		{"2026-11-19T00:00:00Z", "2026-11-19T01:00:00Z", "8:00–9:00 AM", "Thu"},
		{"2026-11-19T15:30:00Z", "2026-11-19T17:30:00Z", "11/19/2026, 11:30 PM–11/20/2026, 1:30 AM", "Thu"},
		{"2026-11-19T16:00:00Z", "2026-11-19T20:00:00Z", "12:00–4:00 AM", "Fri"},
		{"2026-11-19T04:00:00Z", "2026-11-20T04:00:00Z", "11/19/2026, 12:00 PM–11/20/2026, 12:00 PM", "Thu"},
		{"2026-11-19T03:00:00Z", "2026-11-19T04:30:00Z", "11:00 AM–12:30 PM", "Thu"},
		{"2026-11-19T04:00:00Z", "2026-11-19T03:00:00Z", "12:00 PM–11:00 AM", "Thu"},
		{"2026-11-19T15:59:00Z", "2026-11-19T16:00:00Z", "11/19/2026, 11:59 PM–11/20/2026, 12:00 AM", "Thu"},
		{"2026-11-19T03:59:00Z", "2026-11-19T04:00:00Z", "11:59 AM–12:00 PM", "Thu"},
	}
	for _, c := range cases {
		s, e := mustTime(t, c.start), mustTime(t, c.end)
		if got := sessionHours(s, e); got != c.want {
			t.Errorf("sessionHours(%s, %s) = %q, want %q", c.start, c.end, got, c.want)
		}
		if got := sessionDay(s); got != c.day {
			t.Errorf("sessionDay(%s) = %q, want %q", c.start, got, c.day)
		}
	}
}

func mustTime(t *testing.T, s string) time.Time {
	t.Helper()
	v, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func TestDerivedIDIsTheTypeScriptsDerivedId(t *testing.T) {
	// node: sha256("op:waitlist")[0:16] with byte 6 = (b & 0x0f) | 0x80 and byte 8 = (b & 0x3f) | 0x80
	got := derivedID("11111111-1111-4111-8111-111111111111", "waitlist").String()
	if got != "16c74b40-03c8-89a9-9057-acc4ec012f15" {
		t.Errorf("derivedID = %s, want %s", got, "16c74b40-03c8-89a9-9057-acc4ec012f15")
	}
}
