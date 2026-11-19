package signedin

import (
	"context"
	"errors"
	"math"
	"slices"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// The session a signed-in Player reads on a session page, in the shapes the shared rules read. Ports of matchContext
// and matchView in packages/db/src/queue/match-store.ts and of liveRoster, liveCourts in session-store.ts.

// loadedSession is one session with its roster, courts and matches.
type loadedSession struct {
	row sqlcgen.GetSessionForPlayerReadRow
	// rosterAll is every entry in slot order; roster is the live ones (neither released nor no show).
	rosterAll []sqlcgen.ListSessionRosterRowsRow
	roster    []sqlcgen.ListSessionRosterRowsRow
	// courtsAll is every court in creation order; courts are the live ones as the rules read them.
	courtsAll []sqlcgen.ListSessionCourtRowsRow
	courts    []model.Court
	// matches are the session's matches in match number order; matchRows hold the stored row of each, in the same order.
	matches   []model.Match
	matchRows []sqlcgen.ListSessionMatchRowsRow
	// rules is the live roster in the rule shape (the roster the TypeScript's context holds).
	rules []model.Player
}

// msOf is a Date's getTime().
func msOf(t pgtype.Timestamptz) int64 { return t.Time.UnixMilli() }

func msPtr(t pgtype.Timestamptz) *int64 {
	if !t.Valid {
		return nil
	}
	v := msOf(t)
	return &v
}

// sessionBySlug is the session behind a page slug; a missing one, or one whose page was removed, is not found.
func sessionBySlug(ctx context.Context, q *sqlcgen.Queries, slug string) (sqlcgen.GetSessionForPlayerReadRow, error) {
	row, err := q.GetSessionForPlayerRead(ctx, slug)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && row.PublicationDeleted) {
		return row, errNotFound
	}
	return row, err
}

// levelOf is levelCodeFor of a roster entry.
func levelOf(id pgtype.Int2) *string { return publicreads.LevelCode(id) }

// loadSession reads the session by its slug with everything the match context holds.
func loadSession(ctx context.Context, q *sqlcgen.Queries, slug string) (*loadedSession, error) {
	row, err := sessionBySlug(ctx, q, slug)
	if err != nil {
		return nil, err
	}
	ls := &loadedSession{row: row}
	if ls.rosterAll, err = q.ListSessionRosterRows(ctx, row.ID); err != nil {
		return nil, err
	}
	for _, e := range ls.rosterAll {
		if e.IsLive {
			ls.roster = append(ls.roster, e)
			ls.rules = append(ls.rules, model.Player{
				ID: e.ID.String(), SessionID: row.ID.String(), ClubPlayerID: e.ClubPlayerID.String(), NameSnapshot: e.NameSnapshot,
				Present: e.Present, PresentChangedAt: msPtr(e.PresentChangedAt), Level: levelOf(e.SkillLevelID),
				LevelLockedAt: msPtr(e.LevelLockedAt), ConfirmedAt: msOf(e.ConfirmedAt),
			})
		}
	}
	if ls.courtsAll, err = q.ListSessionCourtRows(ctx, row.ID); err != nil {
		return nil, err
	}
	for _, c := range ls.courtsAll {
		if !c.RemovedAt.Valid {
			ls.courts = append(ls.courts, model.Court{
				ID: c.ID.String(), SessionID: row.ID.String(), Label: c.Label, StartsAt: msPtr(c.StartsAt),
				OpenedEarlyAt: msPtr(c.OpenedEarlyAt), OpenUntil: msPtr(c.OpenUntil),
			})
		}
	}
	if ls.matchRows, err = q.ListSessionMatchRows(ctx, row.ID); err != nil {
		return nil, err
	}
	parts, err := q.ListSessionParticipationRows(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	holds, err := q.ListSessionCourtHoldRows(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	usage, err := q.ListSessionCourtUsageRows(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	partsOf := map[pgtype.UUID][]sqlcgen.ListSessionParticipationRowsRow{}
	for _, p := range parts {
		partsOf[p.MatchID] = append(partsOf[p.MatchID], p)
	}
	holdsOf := map[pgtype.UUID][]string{}
	for _, h := range holds {
		holdsOf[h.MatchID] = append(holdsOf[h.MatchID], h.CourtID.String())
	}
	usageOf := map[pgtype.UUID][]sqlcgen.ListSessionCourtUsageRowsRow{}
	for _, u := range usage {
		usageOf[u.MatchID] = append(usageOf[u.MatchID], u)
	}
	for _, m := range ls.matchRows {
		ls.matches = append(ls.matches, matchView(m, partsOf[m.ID], holdsOf[m.ID], usageOf[m.ID]))
	}
	return ls, nil
}

// matchView is matchView: the rule shape of a stored match. Current team members are open segments; a substitution is a
// closed segment and the segment opened by the same operation, whose credit says who gets the game. A match that is over
// lists the players who finished it; a placed or playing one holds its courts.
func matchView(m sqlcgen.ListSessionMatchRowsRow, parts []sqlcgen.ListSessionParticipationRowsRow, holds []string,
	usage []sqlcgen.ListSessionCourtUsageRowsRow) model.Match {

	var open []sqlcgen.ListSessionParticipationRowsRow
	for _, p := range parts {
		if !p.LeftAt.Valid {
			open = append(open, p)
		}
	}
	subs := []model.Substitution{}
	for _, out := range parts {
		if !out.LeftAt.Valid || !out.LeftOperationID.Valid {
			continue
		}
		for _, in := range parts {
			if in.JoinedOperationID == out.LeftOperationID && in.ID != out.ID {
				subs = append(subs, model.Substitution{
					OutID: out.SessionPlayerID.String(), InID: in.SessionPlayerID.String(), Team: string(out.Team),
					At: msOf(out.LeftAt), CreditTo: model.Some(string(in.CreditTo)),
				})
				break
			}
		}
	}
	live := m.State == sqlcgen.MatchStateWaiting || m.State == sqlcgen.MatchStateOnCourt || m.State == sqlcgen.MatchStateActive
	members := open
	if !live {
		members = nil
		for _, p := range parts {
			if p.FinishedWithMatch {
				members = append(members, p)
			}
		}
	}
	teamA, teamB := []string{}, []string{}
	for _, p := range members {
		switch p.Team {
		case sqlcgen.TeamSideA:
			teamA = append(teamA, p.SessionPlayerID.String())
		case sqlcgen.TeamSideB:
			teamB = append(teamB, p.SessionPlayerID.String())
		}
	}
	courtIDs := []string{}
	switch m.State {
	case sqlcgen.MatchStateOnCourt, sqlcgen.MatchStateActive:
		courtIDs = append(courtIDs, holds...)
	case sqlcgen.MatchStateWaiting:
	default:
		for _, u := range usage {
			if !u.ReleasedAt.Valid || (m.DecisionSourceOperationID.Valid && u.ReleaseOperationID == m.DecisionSourceOperationID) {
				courtIDs = append(courtIDs, u.CourtID.String())
			}
		}
	}
	placed := model.Null[int64]()
	if m.PlacedAt.Valid {
		placed = model.Some(msOf(m.PlacedAt))
	}
	out := model.Match{
		ID: m.ID.String(), SessionID: m.SessionID.String(), MatchNo: int64(m.MatchNo), State: string(m.State), Format: model.Format(m.Format),
		QueuePosition: m.QueuePosition.Int64, Origin: string(m.Origin), ManualProtected: m.ManualProtected,
		TeamA: teamA, TeamB: teamB, CourtIDs: courtIDs, PlacedAt: placed,
		StartedAt: msPtr(m.StartedAt), EndedAt: msPtr(m.EndedAt), Substitutions: subs,
	}
	if m.DecisionKind.Valid {
		d := &model.Decision{Kind: string(m.DecisionKind.MatchDecisionKind), ConfirmedAt: msOf(m.DecisionConfirmedAt)}
		if m.DecisionWinningTeam.Valid {
			w := string(m.DecisionWinningTeam.TeamSide)
			d.WinningTeam = &w
		}
		if m.DecisionTeamAScore.Valid {
			v := int64(m.DecisionTeamAScore.Int32)
			d.TeamAScore = &v
		}
		if m.DecisionTeamBScore.Valid {
			v := int64(m.DecisionTeamBScore.Int32)
			d.TeamBScore = &v
		}
		out.Decision = d
	}
	return out
}

// ---- the shared rules the session page reads ----

// courtNames is courtNames: the labels of a match's courts joined with " + ", "Court" for one the list does not hold.
func courtNames(m model.Match, courts []model.Court) string {
	names := make([]string, len(m.CourtIDs))
	for i, id := range m.CourtIDs {
		names[i] = "Court"
		for _, c := range courts {
			if c.ID == id {
				names[i] = c.Label
				break
			}
		}
	}
	return strings.Join(names, " + ")
}

// courtFreeSince is courtFreeSince: the latest end of a match that started on the court by now, or nil when nothing has
// played there yet. A match still on the court has no end.
func courtFreeSince(courtID string, matches []model.Match, now int64) *int64 {
	var best *int64
	for _, m := range matches {
		if !slices.Contains(m.CourtIDs, courtID) || m.StartedAt == nil || *m.StartedAt > now {
			continue
		}
		if m.EndedAt == nil || *m.EndedAt > now {
			continue
		}
		if best == nil || *m.EndedAt > *best {
			v := *m.EndedAt
			best = &v
		}
	}
	return best
}

// selfCheckInMark is selfCheckInMark (D-2026-11-09-03): the Queue Master's last action wins. "checked-in" only while
// present and no presence change came after the player's own I'm here; "left" only while not present and nothing came
// after their I'm leaving; "" otherwise.
func selfCheckInMark(present bool, changedAt int64, selfCheckedInAt, leftAt *int64) string {
	switch {
	case present && selfCheckedInAt != nil && changedAt <= *selfCheckedInAt:
		return "checked-in"
	case !present && leftAt != nil && changedAt <= *leftAt:
		return "left"
	}
	return ""
}

// myMatchLabel is myMatchLabel: "with A vs B, C", "vs B, C" alone, "with A" with no opponent named yet.
func myMatchLabel(partners, opponents []string) string {
	var parts []string
	if len(partners) > 0 {
		parts = append(parts, "with "+strings.Join(partners, ", "))
	}
	if len(opponents) > 0 {
		parts = append(parts, "vs "+strings.Join(opponents, ", "))
	}
	return strings.Join(parts, " ")
}

// recordMatch is one finished or invalid match of the session record, in start order (RecordMatch).
type recordMatch struct {
	m          model.Match
	courtNames []string
	startedAt  int64
	endedAt    int64
	replayEnd  int64
}

type recordHistory struct {
	courtLabels []string
	matches     []recordMatch
	from, to    int64
}

const (
	minuteMs         = 60_000
	replayMaxMatch   = 90 * minuteMs
	replayFallbackMs = 20 * minuteMs
)

// sessionRecordHistory is sessionRecordHistory: a finished session's matches shaped for the record, with the courts
// they used and the replay's time bounds. Only the fields the public match history carries are built.
func sessionRecordHistory(fallbackStart int64, courts []sqlcgen.ListSessionCourtRowsRow, matches []model.Match) recordHistory {
	var played []model.Match
	for _, m := range matches {
		if m.StartedAt != nil && m.EndedAt != nil {
			played = append(played, m)
		}
	}
	sort.SliceStable(played, func(i, j int) bool { return *played[i].StartedAt < *played[j].StartedAt })
	var shown []sqlcgen.ListSessionCourtRowsRow
	for _, c := range courts {
		usedBy := slices.ContainsFunc(played, func(m model.Match) bool { return slices.Contains(m.CourtIDs, c.ID.String()) })
		if !c.RemovedAt.Valid || usedBy {
			shown = append(shown, c)
		}
	}
	replayEnd := func(m model.Match) int64 {
		start := *m.StartedAt
		if *m.EndedAt-start <= replayMaxMatch {
			return *m.EndedAt
		}
		end := start + replayFallbackMs
		for _, x := range played {
			if x.ID == m.ID || *x.StartedAt <= start {
				continue
			}
			if slices.ContainsFunc(x.CourtIDs, func(id string) bool { return slices.Contains(m.CourtIDs, id) }) {
				end = min(end, *x.StartedAt)
			}
		}
		return end
	}
	h := recordHistory{courtLabels: []string{}}
	for _, c := range shown {
		h.courtLabels = append(h.courtLabels, c.Label)
	}
	h.from = fallbackStart
	if len(played) > 0 {
		h.from = math.MaxInt64
	}
	h.to = 0
	for _, m := range played {
		rm := recordMatch{m: m, startedAt: *m.StartedAt, endedAt: *m.EndedAt, replayEnd: replayEnd(m), courtNames: []string{}}
		for _, c := range shown {
			if slices.Contains(m.CourtIDs, c.ID.String()) {
				rm.courtNames = append(rm.courtNames, c.Label)
			}
		}
		h.matches = append(h.matches, rm)
		h.from = min(h.from, rm.startedAt)
		h.to = max(h.to, rm.replayEnd)
	}
	h.to = max(h.to, h.from+minuteMs)
	return h
}
