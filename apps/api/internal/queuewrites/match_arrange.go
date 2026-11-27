package queuewrites

import (
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Arranging the courts and the lineups (task 2.4; match-control.ts, match-queue.ts and session-preparation.ts on main): Clear queue,
// Trade courts, Switch sides, Swap from match, Pause match, and Reorder courts.

func (s *server) registerMatchArrange(rt *signedin.Router) {
	const matches = "/api/sessions/{sessionId}/matches"
	rt.Handle("POST "+matches+"/clear", store.AudienceClub, s.club(s.clearQueue))
	rt.Handle("POST "+matches+"/{matchId}/trade-courts", store.AudienceClub, s.club(s.tradeCourts))
	rt.Handle("POST "+matches+"/{matchId}/switch-sides", store.AudienceClub, s.club(s.switchSides))
	rt.Handle("POST "+matches+"/{matchId}/swap-from-match", store.AudienceClub, s.club(s.swapFromMatch))
	rt.Handle("POST "+matches+"/{matchId}/pause", store.AudienceClub, s.club(s.pauseMatch))
	rt.Handle("PATCH /api/sessions/{sessionId}/courts/order", store.AudienceClub, s.club(s.reorderCourts))
}

// clearQueue is POST matches/clear: every waiting match stays as a removed draft; a retry removes nothing.
func (s *server) clearQueue(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		n, err := t.q.ClearWaitingMatches(t.ctx, sqlcgen.ClearWaitingMatchesParams{Now: t.stamp(), SessionID: t.sess.ID})
		return map[string]any{"removed": n}, err
	})
	return writes.Result{Body: done}, err
}

// tradeReply is what Trade courts answers: both matches as stored.
type tradeReply struct {
	Match signedin.Match `json:"match"`
	Other signedin.Match `json:"other"`
}

// tradeCourts is POST trade-courts: two one-court matches (Getting ready or Playing) swap courts. Each keeps its state, players and
// start time; only the holds and the court usage change. Keyed on this match's court usage, so a retry answers both.
func (s *server) tradeCourts(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, withID := body.Text("operationId"), body.Text("withMatchId")
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		reply := func(a, b pgtype.UUID) (any, error) {
			mine, err := t.matchOf(a)
			if err != nil {
				return nil, err
			}
			other, err := t.matchOf(b)
			return tradeReply{Match: mine, Other: other}, err
		}
		if row.acquiredBy(op) {
			other, err := parseRowID(withID)
			if err != nil {
				return nil, err
			}
			return reply(row.m.ID, other)
		}
		other, err := t.activeMatch(withID)
		if err != nil {
			return nil, err
		}
		one := func(x *matchRow) bool {
			return (x.m.State == sqlcgen.MatchStateOnCourt || x.m.State == sqlcgen.MatchStateActive) && x.decision == nil && len(x.holds) == 1
		}
		if row.m.ID == other.m.ID || !one(row) || !one(other) {
			return nil, conflictMatch()
		}
		mine, theirs := row.holds[0].CourtID, other.holds[0].CourtID
		now := t.stamp()
		opID, err := opUUID(op)
		if err != nil {
			return nil, err
		}
		for _, id := range []pgtype.UUID{row.m.ID, other.m.ID} {
			if err := t.q.ReleaseMatchCourtUsage(t.ctx, sqlcgen.ReleaseMatchCourtUsageParams{Now: now, ReleaseOperationID: opID, MatchID: id}); err != nil {
				return nil, err
			}
			if err := t.q.DeleteMatchCourtHolds(t.ctx, id); err != nil {
				return nil, err
			}
		}
		if err := t.acquireCourts(row.m.ID, []pgtype.UUID{theirs}, op, now); err != nil {
			return nil, err
		}
		if err := t.acquireCourts(other.m.ID, []pgtype.UUID{mine}, op, now); err != nil {
			return nil, err
		}
		for _, id := range []pgtype.UUID{row.m.ID, other.m.ID} {
			if err := t.q.BumpMatchRevision(t.ctx, sqlcgen.BumpMatchRevisionParams{Now: now, ID: id}); err != nil {
				return nil, err
			}
		}
		return reply(row.m.ID, other.m.ID)
	})
	return writes.Result{Body: done}, err
}

func (s *server) switchSides(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.tradeTeams(r, club, false)
}

func (s *server) swapFromMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.tradeTeams(r, club, true)
}

// tradeTeams is Switch sides and Swap from match: one player from each team trade teams in place. aTeam is the team the client saw
// aId on, so a retry that finds them already switched answers the match unchanged. protectAlways also protects a Playing match.
func (s *server) tradeTeams(r *http.Request, club pgtype.UUID, protectAlways bool) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	aTeam := body.Text("aTeam")
	if aTeam != "A" && aTeam != "B" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"aTeam": "Choose one player from each team."})
	}
	aID, bID := body.Text("aId"), body.Text("bId")
	first := sqlcgen.TeamSide(aTeam)
	second := sqlcgen.TeamSideA
	if first == sqlcgen.TeamSideA {
		second = sqlcgen.TeamSideB
	}
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if err := requireLineupEditable(row); err != nil {
			return nil, err
		}
		seat := func(id string) *sqlcgen.MatchParticipation {
			i := slices.IndexFunc(row.parts, func(p sqlcgen.MatchParticipation) bool { return p.SessionPlayerID.String() == id && !p.LeftAt.Valid })
			if i < 0 {
				return nil
			}
			return &row.parts[i]
		}
		a, b := seat(aID), seat(bID)
		if a == nil || b == nil || aID == bID {
			return nil, conflictMatch()
		}
		if a.Team == second && b.Team == first {
			return t.matchOf(row.m.ID)
		}
		if a.Team != first || b.Team != second {
			return nil, conflictMatch()
		}
		now := t.stamp()
		if err := t.q.SetParticipationTeam(t.ctx, sqlcgen.SetParticipationTeamParams{Team: second, Now: now, ID: a.ID}); err != nil {
			return nil, err
		}
		if err := t.q.SetParticipationTeam(t.ctx, sqlcgen.SetParticipationTeamParams{Team: first, Now: now, ID: b.ID}); err != nil {
			return nil, err
		}
		if protectAlways || row.m.State == sqlcgen.MatchStateOnCourt {
			err = t.q.MakeMatchManual(t.ctx, sqlcgen.MakeMatchManualParams{Now: now, ID: row.m.ID})
		} else {
			err = t.q.BumpMatchRevision(t.ctx, sqlcgen.BumpMatchRevisionParams{Now: now, ID: row.m.ID})
		}
		if err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// pauseMatch is POST pause: a Playing match goes back to Getting ready on its court(s). Pausing a match that is already Getting ready
// answers it unchanged. Almost done (task 2.6) clears here once its column exists.
func (s *server) pauseMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row.m.State == sqlcgen.MatchStateOnCourt && row.decision == nil {
			return t.matchOf(row.m.ID)
		}
		if row.m.State != sqlcgen.MatchStateActive || row.decision != nil {
			return nil, conflictMatch()
		}
		if err := t.q.PauseMatch(t.ctx, sqlcgen.PauseMatchParams{Now: t.stamp(), ID: row.m.ID}); err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// movedCourtDTO is the court the toast names: the one whose move alone turns the order before into the order after.
type movedCourtDTO struct {
	CourtID  string `json:"courtId"`
	Position int    `json:"position"`
}

// movedCourt is movedCourt (queueSession.types.ts): nil when the order is the same; else the court whose move alone gives the new
// order (the one now earlier when two could), or the first court whose place changed.
func movedCourt(before, after []string) *movedCourtDTO {
	if slices.Equal(before, after) {
		return nil
	}
	without := func(ids []string, id string) []string {
		return slices.DeleteFunc(slices.Clone(ids), func(x string) bool { return x == id })
	}
	pick := -1
	for i, id := range after {
		if slices.Equal(without(before, id), without(after, id)) {
			pick = i
			break
		}
	}
	if pick < 0 {
		for i, id := range after {
			if i >= len(before) || before[i] != id {
				pick = i
				break
			}
		}
	}
	if pick < 0 {
		return nil
	}
	return &movedCourtDTO{CourtID: after[pick], Position: pick + 1}
}

// reorderCourts is PATCH courts/order: courtIds is the whole new order of the live courts, each once; they take positions 1..n.
// The same order again writes nothing. A list that no longer matches the live courts is a conflict.
func (s *server) reorderCourts(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	list, ok := body["courtIds"].([]any)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	ids := make([]string, len(list))
	for i, v := range list {
		if ids[i], ok = v.(string); !ok {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
		}
	}
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireCourtState(t); err != nil {
			return nil, err
		}
		live, err := t.q.ListQueueSessionCourts(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		byID := make(map[string]sqlcgen.SessionCourt, len(live))
		before := make([]string, len(live))
		for i, c := range live {
			byID[c.ID.String()] = c
			before[i] = c.ID.String()
		}
		seen := map[string]bool{}
		for _, id := range ids {
			if _, known := byID[id]; !known || seen[id] {
				return nil, conflict("court", "Something changed. Review the courts again.")
			}
			seen[id] = true
		}
		if len(ids) != len(live) {
			return nil, conflict("court", "Something changed. Review the courts again.")
		}
		ordered := make([]sqlcgen.SessionCourt, len(ids))
		changed := false
		for n, id := range ids {
			court := byID[id]
			if int(court.Position) != n+1 {
				changed = true
				if court, err = t.q.SetSessionCourtPosition(t.ctx, sqlcgen.SetSessionCourtPositionParams{Position: int32(n + 1), Now: t.stamp(), ID: court.ID}); err != nil {
					return nil, err
				}
			}
			ordered[n] = court
		}
		if changed {
			if _, err := t.touch(); err != nil {
				return nil, err
			}
		}
		return map[string]any{"courts": courtsOf(ordered), "moved": movedCourt(before, ids)}, nil
	})
	return writes.Result{Body: out}, mapDatabaseError(err)
}
