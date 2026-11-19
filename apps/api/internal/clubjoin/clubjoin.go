// Package clubjoin is what a club's invite link means, shared by the two routes that use one: a signed-in player joining
// (POST /api/me/clubs, internal/playerwrites) and a visitor registering through the link (POST /api/register/{clubId},
// internal/auth/register). It ports requireClubInvite (packages/db/src/admin/club-invite.ts) and addPlayerToClub
// (packages/db/src/player/my-clubs.ts), so the two can never disagree about which link works or what a join writes.
package clubjoin

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Unavailable is the refusal for a missing, wrong or regenerated code, and for an unknown club: a link never reveals which
// part was wrong (clubLinkUnavailable).
func Unavailable() error {
	return writes.Fail(httpapi.ErrNotFound, map[string]string{"club": "This club link is not available."})
}

// Club is a club a link names.
type Club struct {
	ID   pgtype.UUID
	Name string
}

// RequireInvite is requireClubInvite: the club whose id is clubText and whose current invite code is inviteCode (trimmed and
// upper-cased the way JavaScript does it). A club id that is no UUID, a code that cannot be a stored one, a wrong code and an
// unknown club all answer Unavailable.
func RequireInvite(ctx context.Context, q *sqlcgen.Queries, clubText, inviteCode string) (Club, error) {
	code, shaped := signedin.ReadClubInviteCode(inviteCode)
	id, isUUID := ParseUUID(clubText)
	if !isUUID || !shaped {
		return Club{}, Unavailable()
	}
	row, err := q.GetClubInviteName(ctx, sqlcgen.GetClubInviteNameParams{ID: id, Code: pgtype.Text{String: code, Valid: true}})
	if errors.Is(err, pgx.ErrNoRows) {
		return Club{}, Unavailable()
	}
	if err != nil {
		return Club{}, err
	}
	return Club{ID: row.ID, Name: row.Name}, nil
}

// AddToClub is joinInTransaction: it saves the player to the club, or brings back the row they left (history keeps one row per
// club and player). An unknown club is refused. now stamps the rows. A second join that raced the first fails with a unique
// violation, which the caller treats as already joined. Callers check the link first; this never does.
func AddToClub(ctx context.Context, q *sqlcgen.Queries, now pgtype.Timestamptz, player, club pgtype.UUID) error {
	if _, err := q.ClubExists(ctx, club); errors.Is(err, pgx.ErrNoRows) {
		return Unavailable()
	} else if err != nil {
		return err
	}
	existing, err := q.GetClubPlayerLink(ctx, sqlcgen.GetClubPlayerLinkParams{ClubID: club, PlayerID: player})
	if err == nil {
		if existing.RemovedAt.Valid {
			return q.ReviveClubPlayer(ctx, sqlcgen.ReviveClubPlayerParams{Now: now, ID: existing.ID})
		}
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	names, err := q.GetPlayerNames(ctx, player)
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Fail(httpapi.ErrForbidden, nil)
	}
	if err != nil {
		return err
	}
	id := uuid.New() // randomUUID()
	return q.InsertSavedClubPlayer(ctx, sqlcgen.InsertSavedClubPlayerParams{
		ID: pgtype.UUID{Bytes: id, Valid: true}, ClubID: club, PlayerID: player, DisplayName: names.FullName, Nickname: names.Nickname, Now: now,
	})
}

// ParseUUID is the TypeScript's UUID test (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i): 36 characters,
// hyphens in their places, hex digits of either case, and nothing else (no braces, no spaces).
func ParseUUID(s string) (pgtype.UUID, bool) {
	var out pgtype.UUID
	if len(s) != 36 {
		return out, false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case i == 8 || i == 13 || i == 18 || i == 23:
			if c != '-' {
				return out, false
			}
		case c >= '0' && c <= '9', c >= 'a' && c <= 'f', c >= 'A' && c <= 'F':
		default:
			return out, false
		}
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return out, false
	}
	return pgtype.UUID{Bytes: id, Valid: true}, true
}
