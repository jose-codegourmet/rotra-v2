// Package profile is the player's own profile details: validation of what the registration and Edit profile
// forms send, and the write that saves it. It ports packages/db/src/player/profile.ts (updateMyProfile,
// currentExperienceMonths, experienceUpdate) and the field rules of @rotra/schema/personal-details.
package profile

import "time"

// CurrentExperienceMonths is the experience as of now. The stored months are a snapshot taken at recordedAt, so
// "playing since" is fixed and the count keeps going: the snapshot plus the UTC calendar months since (a
// calendar month difference, never negative). A missing snapshot is nil.
func CurrentExperienceMonths(months *int32, recordedAt *time.Time, now time.Time) *int32 {
	if months == nil {
		return nil
	}
	if recordedAt == nil {
		return months
	}
	n, r := now.UTC(), recordedAt.UTC()
	elapsed := (n.Year()-r.Year())*12 + int(n.Month()) - int(r.Month())
	out := *months + int32(max(elapsed, 0))
	return &out
}

// Change says what to write to the two experience columns, which are set or cleared together
// (players_experience_recorded_check).
type Change struct {
	// Keep is true when the value is unchanged: both columns stay as they are, original recorded date included.
	Keep bool
	// Months and RecordedAt are the new values; both nil clears them.
	Months     *int32
	RecordedAt *time.Time
}

// ExperienceChange is experienceUpdate in profile.ts: an unchanged value keeps its original recorded date, a new
// value is recorded now, none clears both. shown is what the form showed (CurrentExperienceMonths).
func ExperienceChange(next, shown *int32, now time.Time) Change {
	if (next == nil && shown == nil) || (next != nil && shown != nil && *next == *shown) {
		return Change{Keep: true}
	}
	if next == nil {
		return Change{}
	}
	at := now
	return Change{Months: next, RecordedAt: &at}
}
