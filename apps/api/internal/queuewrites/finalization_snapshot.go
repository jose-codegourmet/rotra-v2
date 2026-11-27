package queuewrites

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionresult"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

// writeResultSnapshot is writeResultSnapshot (packages/db/src/player/projections.ts): the private snapshot for a finalized session, with its
// standings, awards and Off Day in a column of their own. It runs as the result_snapshot job, once: a snapshot that exists is kept. The rules are
// internal/rules/sessionresult (the prototype reference formula).
func (s *server) writeResultSnapshot(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID, now time.Time) error {
	if _, err := q.GetResultSnapshotOfSession(ctx, session); err == nil {
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	sess, err := q.GetQueueSession(ctx, session)
	if err != nil {
		return err
	}
	mc, err := signedin.MatchContextOf(ctx, q, session)
	if err != nil {
		return err
	}
	clubPlayerIDs := make([]pgtype.UUID, 0, len(mc.Roster))
	for _, r := range mc.Roster {
		id, ok := parseUUIDText(r.ClubPlayerID)
		if !ok {
			continue
		}
		clubPlayerIDs = append(clubPlayerIDs, id)
	}
	profiles, err := q.ListClubPlayerProfiles(ctx, sqlcgen.ListClubPlayerProfilesParams{ClubID: sess.ClubID, Ids: clubPlayerIDs})
	if err != nil {
		return err
	}
	ids := make([]string, 0, len(profiles))
	refs := make([]sessionresult.ClubPlayerRef, 0, len(profiles))
	savedIDs := make([]pgtype.UUID, 0, len(profiles))
	for _, p := range profiles {
		ids = append(ids, p.ID.String())
		ref := sessionresult.ClubPlayerRef{ID: p.ID.String()}
		if p.PlayerID.Valid {
			v := p.PlayerID.String()
			ref.PlayerID = &v
		}
		refs = append(refs, ref)
		savedIDs = append(savedIDs, p.ID)
	}
	// Baseline: each club player's earlier finalized sessions at this club, by full-game win rate. Session summaries count credited substitute
	// games, so the rate is read from the facts, whose full participation never includes them (owner decision, November 6, 2026). There is no
	// three-month window in the query, whatever the type comment says.
	before := pgtype.Timestamptz{Time: now, Valid: true}
	if sess.FinalizedAt.Valid {
		before = sess.FinalizedAt
	}
	prior, err := q.ListPriorSessionSummaries(ctx, sqlcgen.ListPriorSessionSummariesParams{ClubID: sess.ClubID, Ids: savedIDs, SessionID: session, Before: before})
	if err != nil {
		return err
	}
	var baselineSessions []pgtype.UUID
	seen := map[pgtype.UUID]bool{}
	priorSessions := make([]sessionresult.PriorSession, 0, len(prior))
	for _, p := range prior {
		priorSessions = append(priorSessions, sessionresult.PriorSession{ClubPlayerID: p.ClubPlayerID.String(), SessionID: p.SessionID.String()})
		if !seen[p.SessionID] {
			seen[p.SessionID] = true
			baselineSessions = append(baselineSessions, p.SessionID)
		}
	}
	var priorFacts []sessionresult.PriorFact
	if len(prior) > 0 {
		rows, err := q.ListPriorFullFacts(ctx, sqlcgen.ListPriorFullFactsParams{ClubID: sess.ClubID, Ids: savedIDs, SessionIds: baselineSessions})
		if err != nil {
			return err
		}
		for _, f := range rows {
			priorFacts = append(priorFacts, sessionresult.PriorFact{ClubPlayerID: f.ClubPlayerID.String(), SessionID: f.SessionID.String(), FullParticipation: true, Team: f.Team, WinningTeam: f.WinningTeam})
		}
	}
	history := sessionresult.AwardBaseline(ids, priorSessions, priorFacts)
	snap := sessionresult.CreateResultSnapshot(session.String(), mc.Roster, mc.Matches, history, refs, now.UnixMilli())
	standings, err := json.Marshal(snap.Standings)
	if err != nil {
		return err
	}
	awards, err := json.Marshal(struct {
		MVP          *sessionresult.AwardRow       `json:"mvp"`
		MostImproved *sessionresult.ImprovementRow `json:"mostImproved"`
	}{snap.Awards.MVP, snap.Awards.MostImproved})
	if err != nil {
		return err
	}
	offDay, err := json.Marshal(snap.Awards.OffDay)
	if err != nil {
		return err
	}
	id, err := newestID()
	if err != nil {
		return err
	}
	return q.InsertResultSnapshot(ctx, sqlcgen.InsertResultSnapshotParams{
		ID: id, ClubID: sess.ClubID, SessionID: session, CalculationVersion: snap.CalculationVersion, Standings: standings, Awards: awards, OffDay: offDay,
		BaselineSessionIds: baselineSessions, GeneratedAt: pgtype.Timestamptz{Time: time.UnixMilli(snap.GeneratedAt), Valid: true},
	})
}

func parseUUIDText(text string) (pgtype.UUID, bool) {
	var id pgtype.UUID
	return id, id.Scan(text) == nil
}
