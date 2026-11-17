package publicreads

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// rankDTO is PlayerRank on the wire: the stored projection exactly as written. Nothing is calculated, and
// position is always null (ordering belongs to the leaderboard read).
type rankDTO struct {
	PlayerID      string         `json:"playerId"`
	FullName      string         `json:"fullName"`
	Nickname      *string        `json:"nickname"`
	LevelIndex    *int16         `json:"levelIndex"`
	State         string         `json:"state"`
	UpdatePending *pendingUpdate `json:"updatePending"`
	Position      *int           `json:"position"`
	RecentCount   int32          `json:"recentCount"`
	OlderCount    int64          `json:"olderCount"`
}

type pendingUpdate struct {
	SessionTitle string `json:"sessionTitle"`
	ClubName     string `json:"clubName"`
	FinishedAt   string `json:"finishedAt"`
}

// rank answers GET /api/players/{playerId}/rank: { rank }, null when the id names no player with an RTR ID.
// A profile with no stored rank row is "no rank yet" (provisional, no level), not "not found".
//
// The name and nickname are returned as stored. The profile and leaderboard reads mask an always-private
// player; this read does not, exactly as readPlayerRank does today.
func (p *players) rank(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(r)
	if !ok {
		httpapi.WriteJSON(w, http.StatusOK, rankBody{}, httpapi.Public)
		return
	}
	var body rankBody
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		ctx := r.Context()
		row, err := q.GetPlayerRank(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // no player, or no RTR ID
		}
		if err != nil {
			return fmt.Errorf("reading rank: %w", err)
		}
		dto := &rankDTO{PlayerID: id.String(), FullName: row.FullName, Nickname: textPtr(row.Nickname), State: "provisional"}
		body.Rank = dto
		if !row.HasRank {
			return nil
		}
		dto.State = string(row.State.RankState)
		if row.DisplayOrder.Valid {
			dto.LevelIndex = &row.DisplayOrder.Int16
		}
		dto.RecentCount = row.RecentStandardMatchCount.Int32
		counted, err := q.CountPlayerCountedFacts(ctx, id)
		if err != nil {
			return fmt.Errorf("counting facts: %w", err)
		}
		dto.OlderCount = max(0, counted-int64(dto.RecentCount))
		dto.UpdatePending, err = pendingRankUpdate(r, q, id)
		return err
	})
	if err != nil {
		p.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Public)
}

type rankBody struct {
	Rank *rankDTO `json:"rank"`
}

// pendingRankUpdate names the latest session of the player whose rank job has not finished. A job with no
// session behind it (ageing, attribution, assessment) is not reported.
func pendingRankUpdate(r *http.Request, q *sqlcgen.Queries, id pgtype.UUID) (*pendingUpdate, error) {
	s, err := q.GetPendingRankSession(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading pending rank update: %w", err)
	}
	finished := ""
	if s.FinalizedAt.Valid {
		finished = httpapi.ToIso(s.FinalizedAt.Time)
	}
	return &pendingUpdate{SessionTitle: s.Title, ClubName: s.ClubName, FinishedAt: finished}, nil
}
