package claim

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// link is a claim link as found: player-keyed (player is set) or record-keyed (record is set), never both.
type link struct {
	player *playerLink
	record *recordLink
	// digest is the token digest the link was found by.
	digest []byte
}

// playerLink is a link on a `players` row: registration staging, or a linked unclaimed profile.
type playerLink struct {
	sqlcgen.GetPlayerClaimLinkViewRow
	digest []byte
}

// recordLink is a link on a club's own unclaimed record, which has no `players` row yet.
type recordLink struct {
	sqlcgen.GetClubPlayerClaimLinkViewRow
	digest []byte
}

// findLink reads the link a token names, the player-keyed table first (findLink in claim.ts). A nil link with a
// nil error is "no such link".
func findLink(ctx context.Context, q *sqlcgen.Queries, digest []byte) (*link, error) {
	p, err := q.GetPlayerClaimLinkView(ctx, digest)
	if err == nil {
		return &link{player: &playerLink{p, digest}, digest: digest}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	r, err := q.GetClubPlayerClaimLinkView(ctx, digest)
	if err == nil {
		return &link{record: &recordLink{r, digest}, digest: digest}, nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return nil, err
}

func (l *link) state() sqlcgen.PlayerClaimLinkState {
	if l.player != nil {
		return l.player.State
	}
	return l.record.State
}

func text(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func orEmpty(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func uuidOf(u pgtype.UUID) uuid.UUID { return uuid.UUID(u.Bytes) }

func pgUUID(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }

func pgTime(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }
