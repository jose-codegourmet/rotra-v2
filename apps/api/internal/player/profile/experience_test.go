package profile_test

import (
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

func d(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}

func i32(v int32) *int32 { return &v }

// currentExperienceMonths in profile.ts: the snapshot plus the whole UTC calendar months since it was recorded
// (calendar month difference, not elapsed days), never negative; a missing snapshot is null.
func TestCurrentExperienceMonths(t *testing.T) {
	now := d("2026-11-17T12:00:00Z")
	cases := []struct {
		name     string
		months   *int32
		recorded *time.Time
		want     *int32
	}{
		{"none", nil, nil, nil},
		{"none with a date", nil, ptrT(d("2026-01-01T00:00:00Z")), nil},
		{"no recorded date", i32(14), nil, i32(14)},
		{"same month", i32(14), ptrT(d("2026-11-01T00:00:00Z")), i32(14)},
		{"next month starts on the 1st", i32(14), ptrT(d("2026-10-31T23:59:59Z")), i32(15)},
		{"across a year", i32(0), ptrT(d("2025-12-31T00:00:00Z")), i32(11)},
		{"recorded in the future never subtracts", i32(5), ptrT(d("2027-02-01T00:00:00Z")), i32(5)},
	}
	for _, c := range cases {
		got := profile.CurrentExperienceMonths(c.months, c.recorded, now)
		switch {
		case got == nil && c.want == nil:
		case got == nil || c.want == nil || *got != *c.want:
			t.Errorf("%s: %v, want %v", c.name, deref(got), deref(c.want))
		}
	}
}

func ptrT(t time.Time) *time.Time { return &t }

func deref(p *int32) any {
	if p == nil {
		return nil
	}
	return *p
}
