package queuewrites

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// The rules of session preparation that only these commands use. The golden files pin them against the TypeScript; these tests
// pin the corners the golden cases do not reach (no database).

func ts(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

func TestParseInstant(t *testing.T) {
	cases := []struct {
		in   string
		want int64
		ok   bool
	}{
		{"2026-12-05T01:00:00.000Z", 1796432400000, true},
		{"2026-12-05T09:00:00+08:00", 1796432400000, true},
		{"2026-12-05T01:00:00", 1796432400000, true}, // no offset reads as UTC, the server's zone
		{"2026-12-05T01:00", 1796432400000, true},
		{"2026-12-05", 1796428800000, true},
		{"soon", 0, false},
		{"", 0, false},
	}
	for _, c := range cases {
		got, ok := parseInstant(c.in)
		if ok != c.ok || (ok && got != c.want) {
			t.Errorf("parseInstant(%q) = %d, %v; want %d, %v", c.in, got, ok, c.want, c.ok)
		}
	}
}

func TestPublicSlugFor(t *testing.T) {
	id := uuid.MustParse("e8289c83-0600-8b58-bed1-d621d5ce4f50")
	if got := publicSlugFor(id); got != "ce4f50" {
		t.Errorf("slug %q, want ce4f50", got)
	}
}

func TestCourtWindowError(t *testing.T) {
	const h = int64(3_600_000)
	start, end := 10*h, 14*h
	at := func(v int64) *int64 { return &v }
	cases := []struct {
		name  string
		start int64
		end   *int64
		field string
	}{
		{"fine", start, nil, ""},
		{"end after the session", start, at(end + h), "openUntil"},
		{"start before the session", start - h, nil, "startsAt"},
		{"start at the session end", end, nil, "startsAt"},
		{"end not after the start", start + 2*h, at(start + h), "openUntil"},
	}
	for _, c := range cases {
		msg, bad := courtWindowError(c.start, c.end, start, end)
		switch {
		case c.field == "" && bad, c.field != "" && !bad:
			t.Errorf("%s: bad = %v", c.name, bad)
		case c.field != "" && msg[c.field] == "":
			t.Errorf("%s: no message on %s: %v", c.name, c.field, msg)
		}
	}
}

func clash(id uuid.UUID, venue uuid.UUID, name string, from, to time.Time) sqlcgen.ListClashCandidatesRow {
	return sqlcgen.ListClashCandidatesRow{
		ID: pgtype.UUID{Bytes: id, Valid: true}, Title: "Night", VenueID: pgtype.UUID{Bytes: venue, Valid: true},
		VenueName: pgtype.Text{String: name, Valid: true}, ScheduledStartAt: ts(from), ScheduledEndAt: ts(to),
	}
}

func TestSessionOccurrences(t *testing.T) {
	venue, other := uuid.New(), uuid.New()
	start := time.Date(2026, 1, 31, 1, 0, 0, 0, time.UTC)
	draft := occurrenceDraft{start: start.UnixMilli(), end: start.Add(4 * time.Hour).UnixMilli(), venueID: pgtype.UUID{Bytes: venue, Valid: true}, occurrences: 3}

	draft.repeat = "monthly"
	dates := sessionOccurrences(draft, nil)
	var got []string
	for _, d := range dates {
		got = append(got, time.UnixMilli(d.start).UTC().Format("2006-01-02"))
	}
	if want := []string{"2026-01-31", "2026-02-28", "2026-03-31"}; !reflect.DeepEqual(got, want) {
		t.Errorf("monthly dates %v, want %v (the day is kept within the month)", got, want)
	}

	for repeat, n := range map[string]int{"none": 1, "": 1, "weekly": 3, "daily": 3} {
		draft.repeat = repeat
		if got := len(sessionOccurrences(draft, nil)); got != n {
			t.Errorf("repeat %q makes %d dates, want %d", repeat, got, n)
		}
	}
	draft.repeat, draft.occurrences = "weekly", 1
	if got := len(sessionOccurrences(draft, nil)); got != 2 {
		t.Errorf("one occurrence makes %d dates, want at least 2", got)
	}
	draft.occurrences = 99
	if got := len(sessionOccurrences(draft, nil)); got != 12 {
		t.Errorf("99 occurrences make %d dates, want at most 12", got)
	}

	// A venue clash is named before a time clash, whichever comes first.
	draft.repeat = "none"
	timeClash := clash(uuid.New(), other, "Elsewhere", start, start.Add(time.Hour))
	venueClash := clash(uuid.New(), venue, "Here", start, start.Add(time.Hour))
	if got := sessionOccurrences(draft, []sqlcgen.ListClashCandidatesRow{timeClash, venueClash})[0].clash; got != "Venue clash: Here is already booked for Night, 1:00 AM–2:00 AM" {
		t.Errorf("clash %q", got)
	}
	if got := sessionOccurrences(draft, []sqlcgen.ListClashCandidatesRow{timeClash})[0].clash; got != "Time clash: Night runs 1:00 AM–2:00 AM at Elsewhere" {
		t.Errorf("clash %q", got)
	}
	// The session being edited never clashes with itself, and a session that only touches the end does not clash.
	draft.id = timeClash.ID
	if got := sessionOccurrences(draft, []sqlcgen.ListClashCandidatesRow{timeClash})[0].clash; got != "" {
		t.Errorf("a session clashed with itself: %q", got)
	}
	draft.id = pgtype.UUID{}
	after := clash(uuid.New(), other, "Elsewhere", start.Add(4*time.Hour), start.Add(5*time.Hour))
	if got := sessionOccurrences(draft, []sqlcgen.ListClashCandidatesRow{after})[0].clash; got != "" {
		t.Errorf("a session starting at the end clashed: %q", got)
	}
}

func TestStartNewEnd(t *testing.T) {
	const h = int64(3_600_000)
	// 2026-11-19 12:00 in Manila.
	now := time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC).UnixMilli()
	plannedToday, plannedEnd := now-h, now+3*h
	if startNeedsNewEnd(plannedToday, plannedEnd, now) {
		t.Error("a start on the planned day before its end needs no new end")
	}
	if !startNeedsNewEnd(plannedToday, now-30*60_000, now) {
		t.Error("a start after the planned end needs a new end")
	}
	if !startNeedsNewEnd(now+24*h, now+28*h, now) {
		t.Error("a start on another club day needs a new end")
	}
	ptr := func(v int64) *int64 { return &v }
	if _, bad := startNewEndError(plannedToday, plannedEnd, nil, now); bad {
		t.Error("an error where none is needed")
	}
	for name, newEnd := range map[string]*int64{"missing": nil, "past": ptr(now - h), "too far": ptr(now + 25*h)} {
		if msg, bad := startNewEndError(now-30*h, now-26*h, newEnd, now); !bad || msg == "" {
			t.Errorf("%s: no error", name)
		}
	}
	if _, bad := startNewEndError(now-30*h, now-26*h, ptr(now+24*h), now); bad {
		t.Error("exactly a day away is allowed")
	}
}

func TestRequestFormatsInput(t *testing.T) {
	decode := func(s string) any {
		var v any
		if err := json.Unmarshal([]byte(s), &v); err != nil {
			t.Fatal(err)
		}
		return v
	}
	cases := []struct {
		in   string
		want []string
		ok   bool
	}{
		{`["singles","fun_3v3","singles"]`, []string{"singles", "fun_3v3"}, true},
		{`{"doubles":false,"singles":true,"fun_4v4":true}`, []string{"singles", "fun_4v4"}, true},
		{`[]`, []string{}, true},
		{`{}`, []string{}, true},
		{`["nope"]`, nil, false},
		{`[1]`, nil, false},
		{`{"doubles":"yes"}`, nil, false},
		{`"doubles"`, nil, false},
		{`null`, nil, false},
	}
	for _, c := range cases {
		got, ok := requestFormatsInput(decode(c.in))
		if ok != c.ok || (ok && !reflect.DeepEqual(got, c.want)) {
			t.Errorf("requestFormatsInput(%s) = %v, %v; want %v, %v", c.in, got, ok, c.want, c.ok)
		}
	}
}

func TestJavaScriptValues(t *testing.T) {
	for v, want := range map[string]bool{`0`: false, `1`: true, `""`: false, `"x"`: true, `null`: false, `false`: false, `true`: true, `[]`: true, `{}`: true} {
		var x any
		dec := json.NewDecoder(strings.NewReader(v))
		dec.UseNumber()
		if err := dec.Decode(&x); err != nil {
			t.Fatal(err)
		}
		if got := truthy(x); got != want {
			t.Errorf("truthy(%s) = %v, want %v", v, got, want)
		}
	}
	if !isInteger(3) || isInteger(1.5) || !safeInteger(99) || safeInteger(1<<53) {
		t.Error("integer checks")
	}
	if utf16Len("😀") != 2 || utf16Len("ab") != 2 {
		t.Error("utf16Len counts UTF-16 units")
	}
}
