package playerwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Your clubs: POST /api/me/clubs (join from a club link) and DELETE /api/me/clubs/{clubId} (leave). Ports of the Route Handlers in
// apps/player/src/app/api/me/clubs/** and of joinMyClub, addPlayerToClub and leaveMyClub in packages/db/src/player/my-clubs.ts. A join or
// a leave writes no notification and no audit event.

func (s *server) registerClubs(rt *signedin.Router) {
	rt.Handle("POST /api/me/clubs", store.AudiencePlayer, s.player(s.joinClub))
	rt.Handle("DELETE /api/me/clubs/{clubId}", store.AudiencePlayer, s.player(s.leaveClub))
}

// clubLinkUnavailable is the refusal for a missing, wrong or regenerated code, and for an unknown club.
func clubLinkUnavailable() error {
	return writes.Fail(httpapi.ErrNotFound, map[string]string{"club": "This club link is not available."})
}

// membership is `{ playerId, clubId }`: the club's ID as the caller wrote it.
type membership struct {
	PlayerID string `json:"playerId"`
	ClubID   string `json:"clubId"`
}

// joinClub is "Join club from a club link", for the signed-in player only; `inviteCode` is the link's `k` (#712). The link's
// code must be the club's current one: a missing, wrong or regenerated code and an unknown club are refused alike. Repeat-safe.
func (s *server) joinClub(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	clubText := body.Text("clubId")
	code, shaped := signedin.ReadClubInviteCode(body.Text("inviteCode"))
	club, isUUID := parseUUID(clubText)
	if !isUUID || !shaped {
		return writes.Result{}, clubLinkUnavailable()
	}
	if _, err := sqlcgen.New(s.pool).FindClubWithInvite(r.Context(), sqlcgen.FindClubWithInviteParams{ID: club, Code: pgtype.Text{String: code, Valid: true}}); errors.Is(err, pgx.ErrNoRows) {
		return writes.Result{}, clubLinkUnavailable()
	} else if err != nil {
		return writes.Result{}, err
	}
	player := self(p)
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		return s.addToClub(ctx, q, player, club)
	})
	// A second tap that raced the first created the same (club, player) row: already joined.
	if err != nil && !writes.IsUniqueViolation(err) {
		return writes.Result{}, err
	}
	return writes.Result{Body: membership{PlayerID: p.AccountID.String(), ClubID: clubText}}, nil
}

// addToClub is joinInTransaction: saves the player to the club, or brings back the row they left (history keeps one row per
// club and player). An unknown club is refused.
func (s *server) addToClub(ctx context.Context, q *sqlcgen.Queries, player, club pgtype.UUID) error {
	if _, err := q.ClubExists(ctx, club); errors.Is(err, pgx.ErrNoRows) {
		return writes.Fail(httpapi.ErrNotFound, map[string]string{"club": "This club link is not available."})
	} else if err != nil {
		return err
	}
	existing, err := q.GetClubPlayerLink(ctx, sqlcgen.GetClubPlayerLinkParams{ClubID: club, PlayerID: player})
	if err == nil {
		if existing.RemovedAt.Valid {
			return q.ReviveClubPlayer(ctx, sqlcgen.ReviveClubPlayerParams{Now: s.stamp(), ID: existing.ID})
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
		ID: pgtype.UUID{Bytes: id, Valid: true}, ClubID: club, PlayerID: player, DisplayName: names.FullName, Nickname: names.Nickname, Now: s.stamp(),
	})
}

// leaveClub is Leave club (owner decision): it marks the player's own row removed and keeps it for history; never a hard delete.
// Leaving again, leaving a club never joined and a club ID that is no UUID are no-ops that answer the same.
func (s *server) leaveClub(r *http.Request, p session.Principal) (writes.Result, error) {
	clubText := r.PathValue("clubId")
	if club, ok := parseUUID(clubText); ok {
		if err := sqlcgen.New(s.pool).RemoveClubPlayer(r.Context(), sqlcgen.RemoveClubPlayerParams{Now: s.stamp(), ClubID: club, PlayerID: self(p)}); err != nil {
			return writes.Result{}, err
		}
	}
	return writes.Result{Body: membership{PlayerID: p.AccountID.String(), ClubID: clubText}}, nil
}
