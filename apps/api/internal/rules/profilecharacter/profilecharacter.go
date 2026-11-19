// Package profilecharacter holds the rules of the profile character library that the Admin writes use (Go-only,
// bucket 2): pure functions and copy with no database, HTTP, clock or randomness. They are ported from
// packages/data/src/profile-character/profileCharacter.rules.ts and the id check of
// packages/db/src/admin/profile-characters.ts.
package profilecharacter

import "regexp"

// PlayerPage is how many images the player picker shows on a page, and MinShown how many stay shown, so the
// players' first page is full.
const (
	PlayerPage = 15
	MinShown   = 15
)

// The words of the refusals (conflict fields), as the Admin library shows them.
const (
	HideRefusal   = "Keep at least 15 images shown, so the players' first page is full."
	DeleteRefusal = "Keep at least 15 images shown. Upload or show another one first."
	Missing       = "This image is no longer in the library. Reload the list."
	AlreadyBack   = "This image is already back in the library."
)

// idFormat is a seeded id (empty, or one lowercase letter) or an uploaded lowercase UUID; the table check says the
// same. The end of the text is the end, as in the JavaScript pattern (no trailing newline).
var idFormat = regexp.MustCompile(`^(?:[a-z]?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\z`)

// ValidID reports whether id can name an image at all.
func ValidID(id string) bool { return idFormat.MatchString(id) }

// BelowMinimum is the minimum-shown rule: only a shown image counts, and only when no more than the minimum are
// shown. A hidden image can always go.
func BelowMinimum(shown bool, shownCount int) bool { return shown && shownCount <= MinShown }

// IDOfSegment is profileCharacterIdOfSegment: the id a path segment names. The first seeded image's id is empty,
// which an empty segment cannot carry, so it travels as "_" (no id can be "_").
func IDOfSegment(segment string) string {
	if segment == "_" {
		return ""
	}
	return segment
}
