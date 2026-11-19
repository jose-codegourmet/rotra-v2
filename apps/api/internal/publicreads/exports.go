package publicreads

import (
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// The signed-in reads (internal/signedin) show the same people and clubs as the public ones and must write them
// the same way, so the few JavaScript-faithful helpers they share are exported here instead of copied.

// UTF16String is a string carried as UTF-16 units (see utf16String).
type UTF16String = utf16String

// ClubInitials is initials() in the TypeScript club and player services.
func ClubInitials(name string) UTF16String { return clubInitials(name) }

// MaskPublicName is maskPublicName() in @rotra/data/public-session/rules.
func MaskPublicName(name string) string { return maskPublicName(name) }

// JSTrim is String.prototype.trim.
func JSTrim(s string) string { return jsTrim(s) }

// QueryValue is URLSearchParams.get over a raw query string: the first value of key, decoded as a browser does.
func QueryValue(rawQuery, key string) (string, bool) { return queryValue(rawQuery, key) }

// ErrProfileForbidden is an always-private profile asked for by anyone but its owner, where the read refuses it.
var ErrProfileForbidden = errProfileForbidden

// LevelCode is levelCodeFor: the level code of a skill level ID, or nil.
func LevelCode(id pgtype.Int2) *string { return levelOf(id) }

// PublicLevel is publicLevel(levelCode): the level ring group and its label, nil for no level.
func PublicLevel(code *string) (group, label *string) {
	if code == nil {
		return nil, nil
	}
	g, tier, _ := strings.Cut(*code, "_")
	l := capitalize(g) + " " + capitalize(tier)
	return &g, &l
}

// ResolveBanner is resolveProfileBanner: the banner key and image of a chosen banner, or the default one.
func ResolveBanner(chosenID, chosenImage pgtype.Text, shown []sqlcgen.ListShownProfileBannersRow) (key string, image *string) {
	return resolveBanner(chosenID, chosenImage, shown)
}

// TextPtr is a nullable text as a JSON string or null.
func TextPtr(t pgtype.Text) *string { return textPtr(t) }

// PublicFirstName is publicFirstName: the first word of a name, or "Player" for none.
func PublicFirstName(name string) string {
	if words := strings.FieldsFunc(name, isJSSpace); len(words) > 0 {
		return words[0]
	}
	return "Player"
}
