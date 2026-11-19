package publicreads

import (
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// viewerRef is the signed-in Player a public read is made for; the zero value is a visitor.
type viewerRef struct {
	id pgtype.UUID
	ok bool
}

// isMasked is the one masking rule of every public player read (B-54), as isMasked in
// packages/db/src/player/masking.ts. An always-private player is masked for every caller but themself; a
// private one only for a caller who is not signed in. A masked player is sent as the masked name only: no
// full name or nickname, no playing level, no player ID that opens the profile, no game history; the picture
// and the banner stay.
func isMasked(visibility sqlcgen.ProfileVisibility, v viewerRef, playerID pgtype.UUID) bool {
	if v.ok && v.id == playerID {
		return false
	}
	if visibility == sqlcgen.ProfileVisibilityAlwaysPrivate {
		return true
	}
	return visibility == sqlcgen.ProfileVisibilityPrivate && !v.ok
}
