package queuewrites

import (
	"math"
	"strings"
	"time"
	"unicode/utf16"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
)

// The rules of session preparation that only the preparation commands use: the repeating dates and their clashes, the court window,
// the public slug and the new end of a late start. They are ports of packages/data/src/queue-session/queueSession.rules.ts and of
// session-preparation.ts, kept here (not in internal/rules) because no other code shares them; the golden files of the commands pin them.
// `timeLabel` and the date arithmetic of a repeating series read the server's zone in the TypeScript; the captures run with TZ=UTC, as the
// servers do, and Go uses UTC.

const (
	msPerMinute     = 60_000
	msPerDay        = 86_400_000
	courtLabelMax   = 40
	maxSessionMs    = courts.MaxSessionMs
	startNeedsEnd   = "Set a new end time after now to start."
	endAfterNowText = courts.ErrEndAfterNow
)

// parseInstant is Date.parse for the shapes the clients send: an ISO date, or a date and time with or without an offset (no offset
// reads as UTC, the server's zone). Anything else is not a number (NaN), as it is for Date.parse.
func parseInstant(text string) (int64, bool) {
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02T15:04:05.999999999", "2006-01-02T15:04:05", "2006-01-02T15:04", "2006-01-02"} {
		if t, err := time.Parse(layout, text); err == nil {
			return t.UnixMilli(), true
		}
	}
	return 0, false
}

// utf16Len is a string's JavaScript length.
func utf16Len(s string) int { return len(utf16.Encode([]rune(s))) }

// publicSlugFor is publicSlugFor: the id stripped of non-alphanumerics, the last 6 characters, lower case.
func publicSlugFor(id uuid.UUID) string {
	var b strings.Builder
	for _, c := range strings.ToLower(id.String()) {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			b.WriteRune(c)
		}
	}
	s := b.String()
	return s[max(0, len(s)-6):]
}

// courtWindowError is courtWindowError in session-preparation.ts: the planned start is not before the session start and is before
// the session end; the end (nil = session end) is after the start and not after the session end. It answers the field and message.
func courtWindowError(start int64, end *int64, sessionStart, sessionEnd int64) (map[string]string, bool) {
	until := sessionEnd
	if end != nil {
		until = *end
	}
	if until > sessionEnd {
		return map[string]string{"openUntil": "That's after the session ends at " + courts.ClubTimeLabel(sessionEnd) + ". Pick an earlier time, or extend the session first."}, true
	}
	if start < sessionStart || start >= sessionEnd {
		return map[string]string{"startsAt": "Choose a planned start within the session."}, true
	}
	if until <= start {
		return map[string]string{"openUntil": "Choose an end after the planned start."}, true
	}
	return nil, false
}

// firstMessage is Object.values(error)[0] of a one-field error.
func firstMessage(m map[string]string) string {
	for _, v := range m {
		return v
	}
	return ""
}

// occurrenceDraft is what sessionOccurrences reads of a session being created or edited.
type occurrenceDraft struct {
	id          pgtype.UUID // the session being edited; it never clashes with itself
	start, end  int64
	venueID     pgtype.UUID
	repeat      string
	occurrences float64 // NaN when not a number
}

type occurrence struct {
	start, end int64
	clash      string // the clash text; empty is no clash
}

// timeLabel is the TypeScript timeLabel: "1:00 AM" in the server zone (UTC).
func timeLabel(at time.Time) string { return at.UTC().Format("3:04 PM") }

// sessionOccurrences is sessionOccurrences: the dates of a session or a repeating series, each with the clash it would make
// with one of the club's other sessions (one at the same venue first).
func sessionOccurrences(d occurrenceDraft, others []sqlcgen.ListClashCandidatesRow) []occurrence {
	n := 1
	if d.repeat != "" && d.repeat != "none" {
		occ := d.occurrences
		if occ == 0 || math.IsNaN(occ) {
			occ = 4
		}
		n = int(math.Max(2, math.Min(12, occ)))
	}
	minutes := float64(d.end-d.start) / msPerMinute
	if d.end <= d.start {
		minutes = float64(d.end+msPerDay-d.start) / msPerMinute
	}
	base := time.UnixMilli(d.start).UTC()
	out := make([]occurrence, n)
	for i := range out {
		date := base
		switch d.repeat {
		case "weekly":
			date = base.AddDate(0, 0, 7*i)
		case "biweekly":
			date = base.AddDate(0, 0, 14*i)
		case "monthly":
			first := time.Date(base.Year(), base.Month()+time.Month(i), 1, base.Hour(), base.Minute(), base.Second(), base.Nanosecond(), time.UTC)
			dim := time.Date(first.Year(), first.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
			date = first.AddDate(0, 0, min(base.Day(), dim)-1)
		}
		start := date.UnixMilli()
		end := start + int64(minutes*msPerMinute)
		out[i] = occurrence{start: start, end: end, clash: clashOf(d, start, end, others)}
	}
	return out
}

func clashOf(d occurrenceDraft, start, end int64, others []sqlcgen.ListClashCandidatesRow) string {
	var found *sqlcgen.ListClashCandidatesRow
	for i := range others {
		o := &others[i]
		if o.ID == d.id || o.ScheduledStartAt.Time.UnixMilli() >= end || start >= o.ScheduledEndAt.Time.UnixMilli() {
			continue
		}
		if o.VenueID == d.venueID {
			found = o
			break
		}
		if found == nil {
			found = o
		}
	}
	if found == nil {
		return ""
	}
	s, e := timeLabel(found.ScheduledStartAt.Time), timeLabel(found.ScheduledEndAt.Time)
	if found.VenueID == d.venueID {
		return "Venue clash: " + found.VenueName.String + " is already booked for " + found.Title + ", " + s + "–" + e
	}
	return "Time clash: " + found.Title + " runs " + s + "–" + e + " at " + found.VenueName.String
}

// startNeedsNewEnd is startNeedsNewEnd (T3): starting after the planned end, or on another club day than the planned start.
func startNeedsNewEnd(plannedStart, plannedEnd, now int64) bool {
	return now > plannedEnd || courts.ClubDayDiff(plannedStart, now) != 0
}

// startNewEndError is startNewEndError: required when startNeedsNewEnd, then after now and at most 24 hours later.
func startNewEndError(plannedStart, plannedEnd int64, newEnd *int64, now int64) (string, bool) {
	if !startNeedsNewEnd(plannedStart, plannedEnd, now) {
		return "", false
	}
	if newEnd == nil {
		return startNeedsEnd, true
	}
	if *newEnd <= now {
		return endAfterNowText, true
	}
	if *newEnd-now > maxSessionMs {
		return courts.ErrEndWithinDay, true
	}
	return "", false
}

// matchFormatOrder is REQUEST_FORMAT_ORDER.
var matchFormatOrder = []string{"doubles", "singles", "fun_1v2", "fun_3v3", "fun_4v4", "fun_5v5"}

// requestFormatsInput is requestFormatsInput: Players can request from a request body, a list of formats or the switches. ok is
// false when the body leaves it out or sends something malformed (the stored set stays).
func requestFormatsInput(value any) (formats []string, ok bool) {
	known := func(name string) bool {
		for _, f := range matchFormatOrder {
			if f == name {
				return true
			}
		}
		return false
	}
	switch v := value.(type) {
	case []any:
		on := map[string]bool{}
		for _, item := range v {
			name, isText := item.(string)
			if !isText || !known(name) {
				return nil, false
			}
			on[name] = true
		}
		for _, f := range matchFormatOrder {
			if on[f] {
				formats = append(formats, f)
			}
		}
		return append([]string{}, formats...), true
	case map[string]any:
		for _, item := range v {
			if _, isBool := item.(bool); !isBool {
				return nil, false
			}
		}
		for _, f := range matchFormatOrder {
			if v[f] == true {
				formats = append(formats, f)
			}
		}
		return append([]string{}, formats...), true
	}
	return nil, false
}

// timeOf is `new Date(ms)`.
func timeOf(at int64) time.Time { return time.UnixMilli(at).UTC() }
