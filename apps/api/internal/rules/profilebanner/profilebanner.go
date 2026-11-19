// Package profilebanner holds the rules of the profile banner library that the Admin writes use (Go-only, bucket 2):
// pure functions and copy with no database, HTTP, clock or randomness. They are ported from
// packages/data/src/profile-banner/profileBanner.rules.ts and the id check of packages/db/src/admin/profile-banners.ts.
// How a player's banner is drawn (resolveProfileBanner) is a shared read rule and lives in publicreads.
package profilebanner

import "regexp"

// MinShown is how many banners stay shown, so players always have a choice.
const MinShown = 2

// DefaultID is the default banner while no other is marked.
const DefaultID = "court"

// The words of the refusals (conflict fields), as the Admin library shows them.
const (
	HideRefusal    = "Keep at least 2 banners shown, so players have a choice."
	DeleteRefusal  = "Keep at least 2 banners shown. Upload or show another one first."
	Missing        = "This banner is no longer in the library. Reload the list."
	AlreadyBack    = "This banner is already back in the library."
	DefaultRefusal = "This is the default banner. Make another banner the default first."
	DefaultHidden  = "Show this banner before making it the default."
)

// idFormat is a seeded key (a lowercase word of 1 to 24 letters) or an uploaded lowercase UUID; the table check
// says the same. The end of the text is the end, as in the JavaScript pattern (no trailing newline).
var idFormat = regexp.MustCompile(`^(?:[a-z]{1,24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\z`)

// ValidID reports whether id can name a banner at all.
func ValidID(id string) bool { return idFormat.MatchString(id) }

// BelowMinimum is profileBannerBelowMinimum: whether hiding or deleting a banner is refused by the minimum. Only a
// shown banner counts, and only when no more than the minimum are shown. A hidden banner can always go.
func BelowMinimum(shown bool, shownCount int) bool { return shown && shownCount <= MinShown }
