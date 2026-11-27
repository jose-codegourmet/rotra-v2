package playerwrites

import (
	"context"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/clubjoin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Your clubs: POST /api/me/clubs (join from a club link) and DELETE /api/me/clubs/{clubId} (leave). Ports of the Route Handlers in
// apps/player/src/app/api/me/clubs/** and of joinMyClub and leaveMyClub in packages/db/src/player/my-clubs.ts; the link check and the
// join itself are internal/clubjoin, which registration shares. A join or a leave writes no notification and no audit event.

func (s *server) registerClubs(rt *signedin.Router) {
	rt.Handle("POST /api/me/clubs", store.AudiencePlayer, s.player(s.joinClub))
	rt.Handle("DELETE /api/me/clubs/{clubId}", store.AudiencePlayer, s.player(s.leaveClub))
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
	club, err := clubjoin.RequireInvite(r.Context(), sqlcgen.New(s.pool), clubText, body.Text("inviteCode"))
	if err != nil {
		return writes.Result{}, err
	}
	player := self(p)
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if err := clubjoin.AddToClub(ctx, q, s.stamp(), player, club.ID); err != nil {
			return err
		}
		liveupdates.Note(ctx, club.ID, pgtype.UUID{}) // the club's saved players change
		return nil
	})
	// A second tap that raced the first created the same (club, player) row: already joined.
	if err != nil && !writes.IsUniqueViolation(err) {
		return writes.Result{}, err
	}
	return writes.Result{Body: membership{PlayerID: p.AccountID.String(), ClubID: clubText}}, nil
}

// leaveClub is Leave club (owner decision): it marks the player's own row removed and keeps it for history; never a hard delete, and every pending slot transfer the player is part of in the
// club (sender, or recipient or claimant of a transfer link) is cancelled with it (#1018). The club's trusted-host row is not ended here yet.
// Leaving again, leaving a club never joined and a club ID that is no UUID are no-ops that answer the same.
func (s *server) leaveClub(r *http.Request, p session.Principal) (writes.Result, error) {
	clubText := r.PathValue("clubId")
	if club, ok := parseUUID(clubText); ok {
		// A small transaction of its own, so the live-update event commits with the removal (B-26).
		if err := writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
			left, err := q.RemoveClubPlayer(ctx, sqlcgen.RemoveClubPlayerParams{Now: s.stamp(), ClubID: club, PlayerID: self(p)})
			if err != nil {
				return err
			}
			// #1018: leaving ends every pending slot transfer the player is part of in this club. Leaving again (no row left) touches nothing.
			if left > 0 {
				if err := q.CancelPlayerPendingSlotTransfers(ctx, sqlcgen.CancelPlayerPendingSlotTransfersParams{Now: s.stamp(), ClubID: club, PlayerID: self(p)}); err != nil {
					return err
				}
			}
			liveupdates.Note(ctx, club, pgtype.UUID{})
			return nil
		}); err != nil {
			return writes.Result{}, err
		}
	}
	return writes.Result{Body: membership{PlayerID: p.AccountID.String(), ClubID: clubText}}, nil
}
