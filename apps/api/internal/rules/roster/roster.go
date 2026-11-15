// Package roster holds the shared (bucket 1) roster rules: who is in an unfinished match, and how many
// slots a session has and has left. Pure functions: no database, HTTP, clock or randomness.
package roster

import (
	"slices"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// InUnfinishedMatch: Move to waitlist is refused while the player is in any waiting, On court or
// Playing match. A removed waiting draft no longer counts.
func InUnfinishedMatch(rosterID string, matches []model.Match) bool {
	for _, m := range matches {
		unfinished := m.State == model.StateWaiting || m.State == model.StateOnCourt || m.State == model.StateActive
		if unfinished && (slices.Contains(m.TeamA, rosterID) || slices.Contains(m.TeamB, rosterID)) {
			return true
		}
	}
	return false
}

// SlotCapacity is the slots a session offers: courts times players per court.
func SlotCapacity(courts, playersPerCourt int64) int64 { return courts * playersPerCourt }

// OpenSlots is the slots still free; never negative.
func OpenSlots(capacity, rosterCount int64) int64 { return max(0, capacity-rosterCount) }
