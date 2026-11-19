package signedin

import (
	"slices"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

func ptr[T any](v T) *T { return &v }

func TestSelfCheckInMarkIsTheQueueMastersLastAction(t *testing.T) {
	cases := []struct {
		name            string
		present         bool
		changed         int64
		checkedIn, left *int64
		want            string
	}{
		{"checked in and nothing since", true, 10, ptr(int64(10)), nil, "checked-in"},
		{"the Queue Master changed presence after", true, 11, ptr(int64(10)), nil, ""},
		{"left and nothing since", false, 5, nil, ptr(int64(7)), "left"},
		{"the Queue Master changed presence after leaving", false, 8, nil, ptr(int64(7)), ""},
		{"present with only a leave mark", true, 1, nil, ptr(int64(7)), ""},
		{"no marks", false, 1, nil, nil, ""},
	}
	for _, c := range cases {
		if got := selfCheckInMark(c.present, c.changed, c.checkedIn, c.left); got != c.want {
			t.Errorf("%s: %q, want %q", c.name, got, c.want)
		}
	}
}

func TestMyMatchLabel(t *testing.T) {
	for _, c := range []struct {
		partners, opponents []string
		want                string
	}{
		{[]string{"A"}, []string{"B", "C"}, "with A vs B, C"},
		{nil, []string{"B", "C"}, "vs B, C"},
		{[]string{"A"}, nil, "with A"},
		{nil, nil, ""},
	} {
		if got := myMatchLabel(c.partners, c.opponents); got != c.want {
			t.Errorf("%v %v: %q, want %q", c.partners, c.opponents, got, c.want)
		}
	}
}

func TestCourtNamesAndFreeSince(t *testing.T) {
	courts := []model.Court{{ID: "a", Label: "Court 1"}, {ID: "b", Label: "Court 2"}}
	if got := courtNames(model.Match{CourtIDs: []string{"a", "b", "gone"}}, courts); got != "Court 1 + Court 2 + Court" {
		t.Fatalf("got %q", got)
	}
	matches := []model.Match{
		{CourtIDs: []string{"a"}, StartedAt: ptr(int64(10)), EndedAt: ptr(int64(20))},
		{CourtIDs: []string{"a"}, StartedAt: ptr(int64(30)), EndedAt: ptr(int64(50))},
		{CourtIDs: []string{"a"}, StartedAt: ptr(int64(60))},
		{CourtIDs: []string{"b"}, StartedAt: ptr(int64(500)), EndedAt: ptr(int64(600))},
	}
	if got := courtFreeSince("a", matches, 100); got == nil || *got != 50 {
		t.Errorf("a at 100: %v, want 50", got)
	}
	if got := courtFreeSince("a", matches, 25); got == nil || *got != 20 {
		t.Errorf("a at 25: %v, want 20", got)
	}
	if got := courtFreeSince("b", matches, 100); got != nil {
		t.Errorf("b never played by 100: %v", got)
	}
}

func TestSessionRecordHistoryReplayEndAndCourts(t *testing.T) {
	id := func(s string) pgtype.UUID {
		u, _ := parseUUIDString("00000000-0000-4000-8000-00000000000" + s)
		return u
	}
	courts := []sqlcgen.ListSessionCourtRowsRow{
		{ID: id("1"), Label: "One"},
		{ID: id("2"), Label: "Two", RemovedAt: pgtype.Timestamptz{Valid: true}},
		{ID: id("3"), Label: "Three", RemovedAt: pgtype.Timestamptz{Valid: true}},
	}
	const hour = 60 * minuteMs
	matches := []model.Match{
		{ID: "m1", MatchNo: 1, CourtIDs: []string{id("1").String()}, StartedAt: ptr(int64(1000)), EndedAt: ptr(int64(1000 + 4*hour))},
		{ID: "m2", MatchNo: 2, CourtIDs: []string{id("1").String()}, StartedAt: ptr(int64(1000 + hour)), EndedAt: ptr(int64(1000 + hour + 10*minuteMs))},
		{ID: "m4", MatchNo: 5, CourtIDs: []string{id("2").String()}, StartedAt: ptr(int64(7000)), EndedAt: ptr(int64(7000 + 5*hour))},
		{ID: "m5", MatchNo: 6, CourtIDs: []string{id("2").String()}, StartedAt: ptr(int64(7000 + 5*minuteMs)), EndedAt: ptr(int64(7000 + 6*minuteMs))},
		{ID: "m3", MatchNo: 3, CourtIDs: []string{id("2").String()}, StartedAt: ptr(int64(5000)), EndedAt: ptr(int64(6000))},
		{ID: "waiting", MatchNo: 4, State: model.StateWaiting},
	}
	h := sessionRecordHistory(0, courts, matches)
	if !slices.Equal(h.courtLabels, []string{"One", "Two"}) {
		t.Fatalf("a removed court that played stays, an unused one does not: %v", h.courtLabels)
	}
	if len(h.matches) != 5 {
		t.Fatalf("only matches that started and ended: %d", len(h.matches))
	}
	byID := map[string]recordMatch{}
	// m1 ran over 90 minutes; with m2 starting on its court only after the 20 minute fallback, the fallback wins.
	for _, m := range h.matches {
		byID[m.m.ID] = m
	}
	if got, want := byID["m1"].replayEnd, int64(1000+20*minuteMs); got != want {
		t.Errorf("a night-long match ends 20 minutes in, or at the next start on its court if that comes first: %d, want %d", got, want)
	}
	if got, want := byID["m4"].replayEnd, int64(7000+5*minuteMs); got != want {
		t.Errorf("a night-long match ends when the next one starts on its court if that is within 20 minutes: %d, want %d", got, want)
	}
	if byID["m3"].replayEnd != 6000 {
		t.Errorf("a short match keeps its end: %d", byID["m3"].replayEnd)
	}
	if h.from != 1000 || h.to != 1000+hour+10*minuteMs {
		t.Errorf("bounds %d..%d", h.from, h.to)
	}
	empty := sessionRecordHistory(777, nil, nil)
	if empty.from != 777 || empty.to != 777+minuteMs || len(empty.matches) != 0 {
		t.Errorf("no matches: %+v", empty)
	}
}
