// Package courts holds the shared (bucket 1) court and time rules: when a court is open, which courts
// are free, whether a booking has ended, and the session end checks. Pure functions: no database, HTTP
// or clock; the caller passes `now` (epoch milliseconds).
package courts

import (
	"fmt"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// Open is true from the court's planned start, or from when it was opened early. A court without a
// start is open. (TypeScript courtOpen.)
func Open(c model.Court, now int64) bool {
	at := int64(0)
	switch {
	case c.OpenedEarlyAt != nil:
		at = *c.OpenedEarlyAt
	case c.StartsAt != nil:
		at = *c.StartsAt
	}
	return at <= now
}

// OpenedEarly is true when the court was opened early and is still before its planned start;
// afterwards the early open is just history. (TypeScript openedEarly.)
func OpenedEarly(c model.Court, now int64) bool {
	starts := int64(0)
	if c.StartsAt != nil {
		starts = *c.StartsAt
	}
	return c.OpenedEarlyAt != nil && starts > now
}

// Free returns the courts, in their input order, that are not removed, are open and are held by no
// On court or Playing match. (TypeScript freeCourts.)
func Free(courts []model.Court, matches []model.Match, now int64) []model.Court {
	out := []model.Court{}
	for _, c := range courts {
		if c.Removed() || !Open(c, now) || heldByAny(c.ID, matches) {
			continue
		}
		out = append(out, c)
	}
	return out
}

func heldByAny(courtID string, matches []model.Match) bool {
	for _, m := range matches {
		if !m.HoldsCourt() {
			continue
		}
		for _, id := range m.CourtIDs {
			if id == courtID {
				return true
			}
		}
	}
	return false
}

// BookingEnded is true once `now` reaches the court's own end, or the session end when it has none.
// (TypeScript isBookingEnded.)
func BookingEnded(c model.Court, sessionEnd, now int64) bool {
	until := sessionEnd
	if c.OpenUntil != nil {
		until = *c.OpenUntil
	}
	return now >= until
}

// MaxSessionMs is the longest a session runs: 24 hours (T1).
const MaxSessionMs int64 = 86_400_000

// The messages the session end checks return, word for word as the TypeScript.
const (
	ErrEnterDateTime  = "Enter a date and time."
	ErrEndAfterStart  = "Choose an end after the start."
	ErrEndAfterNow    = "Choose an end time after now."
	ErrEndWithinDay   = "Choose an end at most 24 hours after play began."
	conflictOpensFmt  = "%s opens %s. Pick a later end, or edit that court first."
	conflictBookedFmt = "%s is booked until %s. Pick a later end, or edit that court first."
)

// SessionEndCourtConflict: courts that follow the session end (no `openUntil`) move with it. A court
// that opens at or after the new end, or has its own booking past it, blocks the change until that
// court is edited. courtBase is the start courts without a planned start count from. It returns the
// message, or "" and false when nothing blocks. (TypeScript sessionEndCourtConflict.)
func SessionEndCourtConflict(courts []model.Court, endAt, courtBase, now int64) (string, bool) {
	var live []model.Court
	for _, c := range courts {
		if !c.Removed() {
			live = append(live, c)
		}
	}
	for _, c := range live {
		starts := courtBase
		if c.StartsAt != nil {
			starts = *c.StartsAt
		}
		if starts >= endAt {
			return fmt.Sprintf(conflictOpensFmt, c.Label, AtWhenLabel(starts, now)), true
		}
	}
	for _, c := range live {
		if c.OpenUntil != nil && *c.OpenUntil > endAt {
			return fmt.Sprintf(conflictBookedFmt, c.Label, WhenLabel(*c.OpenUntil, now)), true
		}
	}
	return "", false
}

// SessionEndInput is what Set end time checks. EndAt nil is a value that is not a number.
type SessionEndInput struct {
	StartedAt        *int64
	ScheduledStartAt int64
	EndAt            *int64
	Courts           []model.Court
}

// SessionEndError checks a new session end (T2). Live: after now, at most 24 hours after the actual
// start. Prepared: after the planned start, at most 24 hours later. Then the court conflicts. It
// returns the message, or "" and false when the end is fine. (TypeScript sessionEndError.)
func SessionEndError(in SessionEndInput, now int64) (string, bool) {
	if in.EndAt == nil {
		return ErrEnterDateTime, true
	}
	endAt := *in.EndAt
	if in.StartedAt != nil {
		if endAt <= now {
			return ErrEndAfterNow, true
		}
		if endAt-*in.StartedAt > MaxSessionMs {
			return ErrEndWithinDay, true
		}
	} else if endAt <= in.ScheduledStartAt || endAt-in.ScheduledStartAt > MaxSessionMs {
		return ErrEndAfterStart, true
	}
	base := in.ScheduledStartAt
	if in.StartedAt != nil {
		base = *in.StartedAt
	}
	return SessionEndCourtConflict(in.Courts, endAt, base, now)
}
