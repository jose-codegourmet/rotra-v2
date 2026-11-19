package publicreads

import (
	"context"
	"fmt"
	"strings"
	"time"

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

// JSToNumber is Number(string): blank is 0, 0x/0o/0b literals parse, anything that is not a plain decimal is NaN.
func JSToNumber(s string) float64 { return jsToNumber(s) }

// JSToLower is String.prototype.toLowerCase.
func JSToLower(s string) string { return jsToLower(s) }

// PlayingStyle is playingStyle(): the string at personal_details.playingStyle, else empty.
func PlayingStyle(details []byte) string { return playingStyleOf(details) }

// CurrentExperienceMonths is currentExperienceMonths: the stored months counted up to now, false when none are stored.
func CurrentExperienceMonths(months pgtype.Int4, recordedAt pgtype.Timestamptz, now time.Time) (int64, bool) {
	return currentExperienceMonths(months, recordedAt, now)
}

// HistorySession is one session of a games read.
type HistorySession = historySession

// AdminPlayerHistory is readPlayerMatchHistory(playerId, { maskAlwaysPrivate: false }): the games of a player as
// Admin sees them, every name in full. An unknown player has none.
func AdminPlayerHistory(ctx context.Context, q *sqlcgen.Queries, playerID pgtype.UUID) ([]HistorySession, error) {
	facts, err := q.ListPlayerFacts(ctx, playerID)
	if err != nil {
		return nil, fmt.Errorf("listing facts: %w", err)
	}
	return readHistory(ctx, q, historyFactsOf(facts), viewerRef{}, false)
}

// AdminClubPlayerHistory is readClubPlayerMatchHistory: the games of one club record, scoped to that club.
func AdminClubPlayerHistory(ctx context.Context, q *sqlcgen.Queries, clubID, clubPlayerID pgtype.UUID) ([]HistorySession, error) {
	facts, err := q.ListClubPlayerFacts(ctx, sqlcgen.ListClubPlayerFactsParams{ClubID: clubID, ClubPlayerID: clubPlayerID})
	if err != nil {
		return nil, fmt.Errorf("listing club facts: %w", err)
	}
	return readHistory(ctx, q, clubHistoryFactsOf(facts), viewerRef{}, false)
}
