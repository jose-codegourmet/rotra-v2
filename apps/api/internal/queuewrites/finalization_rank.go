package queuewrites

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/player"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// recomputeRank is recomputeRank (packages/db/src/player/projections.ts): one player's player_rank_current from their evidence at `now`. The original
// played date decides the window, so ageing changes eligibility without new games. A stale run (a lower input watermark than the stored one) never
// overwrites a newer projection, and sends no notification.
//
// No rank formula is approved (#247): APPROVED_RANK_ALGORITHMS is empty, so the row records evidence counts, window and eligibility only. The numeric
// rank, level and components stay null (missing, never zero), the state is provisional or needs_reassessment, and nobody is leaderboard eligible.
func (s *server) recomputeRank(ctx context.Context, q *sqlcgen.Queries, playerID pgtype.UUID, now time.Time, jobID pgtype.UUID) error {
	stamp := pgtype.Timestamptz{Time: now, Valid: true}
	policy, err := q.LatestEffectiveRankingPolicy(ctx, stamp)
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Fail(httpapi.ErrUnavailable, nil)
	}
	if err != nil {
		return err
	}
	facts, err := playerFacts(ctx, q, playerID)
	if err != nil {
		return err
	}
	window := time.Duration(player.WindowDays) * 24 * time.Hour
	windowStart := now.Add(-window)
	counts := func(f sqlcgen.ListPlayerRankFactsRow) bool {
		return f.FullParticipation && f.StandardMatch && f.SessionRanked
	}
	inWindow := 0
	var lastValid, oldest *time.Time
	var watermark int64
	for _, f := range facts {
		at := f.PlayedAt.Time.Truncate(time.Millisecond)
		if counts(f) {
			if lastValid == nil {
				lastValid = &at
			}
			if !at.Before(windowStart) && !at.After(now) {
				inWindow++
				if oldest == nil || at.Before(*oldest) {
					oldest = &at
				}
			}
		}
		watermark = max(watermark, f.CreatedAt.Time.UnixMilli())
	}
	assessments, err := q.CountPlayerAssessmentsInWindow(ctx, sqlcgen.CountPlayerAssessmentsInWindowParams{PlayerID: playerID, FromAt: pgtype.Timestamptz{Time: windowStart, Valid: true}, ToAt: stamp})
	if err != nil {
		return err
	}
	nextRecheck := now.Add(window)
	if oldest != nil {
		nextRecheck = oldest.Add(window)
	}
	state := sqlcgen.RankStateProvisional
	if lastValid != nil && lastValid.Before(windowStart) {
		state = sqlcgen.RankStateNeedsReassessment
	}
	var lastValidAt pgtype.Timestamptz
	if lastValid != nil {
		lastValidAt = pgtype.Timestamptz{Time: *lastValid, Valid: true}
	}
	// The key order JSON.stringify gives the object: assessments, recentStandardMatches, facts.
	counted, err := json.Marshal(struct {
		Assessments           int32 `json:"assessments"`
		RecentStandardMatches int   `json:"recentStandardMatches"`
		Facts                 int   `json:"facts"`
	}{assessments, inWindow, len(facts)})
	if err != nil {
		return err
	}
	current, err := q.GetPlayerRankCurrent(ctx, playerID)
	found := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if found && current.InputWatermark > watermark {
		return nil
	}
	explanation := pgtype.Text{String: "formula_pending", Valid: true}
	next := pgtype.Timestamptz{Time: nextRecheck, Valid: true}
	if found {
		err = q.UpdatePlayerRankCurrent(ctx, sqlcgen.UpdatePlayerRankCurrentParams{
			PlayerID: playerID, State: state, ExplanationCode: explanation, InputCounts: counted, PolicyVersionID: policy.ID, AlgorithmVersion: policy.AlgorithmVersion,
			WindowStart: pgtype.Timestamptz{Time: windowStart, Valid: true}, WindowEnd: stamp, Now: s.stamp(), InputWatermark: watermark, NextRecheckAt: next,
			RecentStandardMatchCount: int32(inWindow), LastValidPlayedAt: lastValidAt,
		})
	} else {
		err = q.InsertPlayerRankCurrent(ctx, sqlcgen.InsertPlayerRankCurrentParams{
			PlayerID: playerID, State: state, ExplanationCode: explanation, InputCounts: counted, PolicyVersionID: policy.ID, AlgorithmVersion: policy.AlgorithmVersion,
			WindowStart: pgtype.Timestamptz{Time: windowStart, Valid: true}, WindowEnd: stamp, Now: s.stamp(), InputWatermark: watermark, NextRecheckAt: next,
			RecentStandardMatchCount: int32(inWindow), LastValidPlayedAt: lastValidAt,
		})
	}
	if err != nil {
		return err
	}
	t := &txn{ctx: ctx, q: q, s: s}
	return t.notify(notification{
		playerID: playerID, kind: sqlcgen.PlayerNotificationKindRank, sourceType: "projection_job", sourceID: jobID,
		title: "Your rank was updated", body: "Tap to see what changed.", target: "/players/" + playerID.String() + "/rank",
	})
}

// playerFacts is playerFacts: the facts that belong to a player, their own snapshots plus confirmed, unrevoked guest history, newest first, one
// contribution per (match, entry) whichever path found it.
func playerFacts(ctx context.Context, q *sqlcgen.Queries, playerID pgtype.UUID) ([]sqlcgen.ListPlayerRankFactsRow, error) {
	attributions, err := q.ListPlayerAttributions(ctx, playerID)
	if err != nil {
		return nil, err
	}
	savedIDs := make([]pgtype.UUID, 0, len(attributions))
	attributed := map[[2]pgtype.UUID]bool{}
	for _, a := range attributions {
		savedIDs = append(savedIDs, a.ClubPlayerID)
		attributed[[2]pgtype.UUID{a.ClubID, a.ClubPlayerID}] = true
	}
	rows, err := q.ListPlayerRankFacts(ctx, sqlcgen.ListPlayerRankFactsParams{PlayerID: playerID, ClubPlayerIds: savedIDs})
	if err != nil {
		return nil, err
	}
	seen := map[[2]pgtype.UUID]bool{}
	var out []sqlcgen.ListPlayerRankFactsRow
	for _, f := range rows {
		if f.PlayerIDAtFinalization != playerID && !attributed[[2]pgtype.UUID{f.ClubID, f.ClubPlayerID}] {
			continue
		}
		key := [2]pgtype.UUID{f.MatchID, f.SessionPlayerID}
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, f)
	}
	return out, nil
}
