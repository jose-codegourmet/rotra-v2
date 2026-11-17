package profile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

var (
	// ErrNotFound is returned when there is no such player.
	ErrNotFound = errors.New("profile: player not found")
	// ErrRevisionConflict is returned when the player changed since the caller loaded it (409 conflict).
	ErrRevisionConflict = errors.New("profile: the profile changed since it was loaded")
)

// Save writes the validated details of a player in the caller's transaction, as updateMyProfile does: the row is
// locked FOR UPDATE, the revision is checked when expectedRevision is given (nil skips the check, for a profile
// created in the same transaction), the name, nickname, playing style and experience are written, the revision
// goes up by one, and each named link is upserted or, when empty, removed. It returns the new revision. The
// caller commits.
//
// This is the function the later track that moves PATCH /api/me/profile wires; the registration claim calls it
// in the claim's own transaction.
func Save(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, d Details, expectedRevision *int64, now time.Time) (int64, error) {
	q := sqlcgen.New(tx)
	cur, err := q.LockPlayerProfile(ctx, pgUUID(playerID))
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("profile: locking the player: %w", err)
	}
	if expectedRevision != nil && cur.Revision != *expectedRevision {
		return 0, ErrRevisionConflict
	}

	months, recorded := fromInt4(cur.ExperienceMonths), fromTimestamptz(cur.ExperienceRecordedAt)
	change := ExperienceChange(d.ExperienceMonths, CurrentExperienceMonths(months, recorded, now), now)
	if change.Keep {
		change.Months, change.RecordedAt = months, recorded
	}
	details, err := json.Marshal(map[string]string{"playingStyle": d.PlayingStyle})
	if err != nil {
		return 0, fmt.Errorf("profile: encoding the details: %w", err)
	}
	nickname := pgtype.Text{}
	if d.Nickname != "" {
		nickname = pgtype.Text{String: d.Nickname, Valid: true}
	}
	rev, err := q.UpdatePlayerDetails(ctx, sqlcgen.UpdatePlayerDetailsParams{
		FullName: d.FullName, Nickname: nickname,
		ExperienceMonths: toInt4(change.Months), ExperienceRecordedAt: toTimestamptz(change.RecordedAt),
		PersonalDetails: details, Now: pgtype.Timestamptz{Time: now, Valid: true}, ID: pgUUID(playerID),
	})
	if err != nil {
		return 0, fmt.Errorf("profile: updating the player: %w", err)
	}
	for _, p := range providers {
		link, named := d.Links[p.key]
		if !named {
			continue
		}
		provider := sqlcgen.SocialProvider(p.key)
		if link == "" {
			err = q.DeletePlayerSocialLink(ctx, sqlcgen.DeletePlayerSocialLinkParams{PlayerID: pgUUID(playerID), Provider: provider})
		} else {
			id, nerr := uuid.NewV7()
			if nerr != nil {
				return 0, fmt.Errorf("profile: new link id: %w", nerr)
			}
			err = q.UpsertPlayerSocialLink(ctx, sqlcgen.UpsertPlayerSocialLinkParams{
				ID: pgUUID(id), PlayerID: pgUUID(playerID), Provider: provider, Url: link, Now: pgtype.Timestamptz{Time: now, Valid: true},
			})
		}
		if err != nil {
			return 0, fmt.Errorf("profile: saving the %s link: %w", p.key, err)
		}
	}
	return rev, nil
}

func pgUUID(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }

func fromInt4(v pgtype.Int4) *int32 {
	if !v.Valid {
		return nil
	}
	return &v.Int32
}

func toInt4(v *int32) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *v, Valid: true}
}

func fromTimestamptz(v pgtype.Timestamptz) *time.Time {
	if !v.Valid {
		return nil
	}
	t := v.Time.UTC()
	return &t
}

func toTimestamptz(v *time.Time) pgtype.Timestamptz {
	if v == nil {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *v, Valid: true}
}
