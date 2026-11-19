package signedin

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// GET /api/sessions/{sessionId}/matches: the session's matches with the queue and session revisions the screen sends
// back. Port of readSessionMatches and matchDto in packages/db/src/queue/{match-queue,match-store}.ts. The rule shape of a
// stored match (matchView) is the one the Player session reads use.

type queueSubstitutionDTO struct {
	OutID    string  `json:"outId"`
	InID     string  `json:"inId"`
	Team     string  `json:"team"`
	At       string  `json:"at"`
	CreditTo *string `json:"creditTo"`
}

type queueDecisionDTO struct {
	Kind        string  `json:"kind"`
	WinningTeam *string `json:"winningTeam"`
	TeamAScore  *int64  `json:"teamAScore"`
	TeamBScore  *int64  `json:"teamBScore"`
	ConfirmedAt string  `json:"confirmedAt"`
}

type queueMatchDTO struct {
	ID              string                 `json:"id"`
	SessionID       string                 `json:"sessionId"`
	MatchNo         int64                  `json:"matchNo"`
	State           string                 `json:"state"`
	Format          string                 `json:"format"`
	QueuePosition   int64                  `json:"queuePosition"`
	Origin          string                 `json:"origin"`
	ManualProtected bool                   `json:"manualProtected"`
	TeamA           []string               `json:"teamA"`
	TeamB           []string               `json:"teamB"`
	CourtIDs        []string               `json:"courtIds"`
	PlacedAt        *string                `json:"placedAt"`
	StartedAt       *string                `json:"startedAt"`
	EndedAt         *string                `json:"endedAt"`
	Substitutions   []queueSubstitutionDTO `json:"substitutions"`
	Decision        *queueDecisionDTO      `json:"decision"`
	Revision        string                 `json:"revision"`
}

func isoMs(ms int64) string { return httpapi.ToIso(msTime(ms)) }

func isoMsPtr(ms *int64) *string {
	if ms == nil {
		return nil
	}
	s := isoMs(*ms)
	return &s
}

// sessionMatchViews is sessionMatches in the rule shape: the session's matches in number order (a discarded draft is
// left out), each with the rows it was read from.
func sessionMatchViews(r *http.Request, q *sqlcgen.Queries, sessionID pgtype.UUID) ([]model.Match, []sqlcgen.ListSessionMatchRowsRow, error) {
	ctx := r.Context()
	rows, err := q.ListSessionMatchRows(ctx, sessionID)
	if err != nil {
		return nil, nil, err
	}
	parts, err := q.ListSessionParticipationRows(ctx, sessionID)
	if err != nil {
		return nil, nil, err
	}
	holds, err := q.ListSessionCourtHoldRows(ctx, sessionID)
	if err != nil {
		return nil, nil, err
	}
	usage, err := q.ListSessionCourtUsageRows(ctx, sessionID)
	if err != nil {
		return nil, nil, err
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
	views := make([]model.Match, 0, len(rows))
	for _, row := range rows {
		views = append(views, matchView(row, partsOf[row.ID], holdsOf[row.ID], usageOf[row.ID]))
	}
	return views, rows, nil
}

// matchesOf loads the session's matches in the wire shape, with the stored revision of each.
func matchesOf(r *http.Request, q *sqlcgen.Queries, sessionID pgtype.UUID) ([]queueMatchDTO, error) {
	views, rows, err := sessionMatchViews(r, q, sessionID)
	if err != nil {
		return nil, err
	}
	revs, err := q.ListQueueMatchRevisions(r.Context(), sessionID)
	if err != nil {
		return nil, err
	}
	revision := map[pgtype.UUID]int64{}
	for _, v := range revs {
		revision[v.ID] = v.Revision
	}
	out := make([]queueMatchDTO, 0, len(rows))
	for i, row := range rows {
		m := views[i]
		d := queueMatchDTO{
			ID: m.ID, SessionID: m.SessionID, MatchNo: m.MatchNo, State: m.State, Format: string(m.Format), QueuePosition: m.QueuePosition,
			Origin: m.Origin, ManualProtected: m.ManualProtected, TeamA: m.TeamA, TeamB: m.TeamB, CourtIDs: m.CourtIDs,
			PlacedAt: isoPtr(row.PlacedAt), StartedAt: isoPtr(row.StartedAt), EndedAt: isoPtr(row.EndedAt),
			Substitutions: []queueSubstitutionDTO{}, Revision: httpapi.ToDecimalString(revision[row.ID]),
		}
		for _, sub := range m.Substitutions {
			credit, _ := sub.CreditTo.Value()
			var c *string
			if _, ok := sub.CreditTo.Value(); ok {
				c = &credit
			}
			d.Substitutions = append(d.Substitutions, queueSubstitutionDTO{OutID: sub.OutID, InID: sub.InID, Team: sub.Team, At: isoMs(sub.At), CreditTo: c})
		}
		if m.Decision != nil {
			d.Decision = &queueDecisionDTO{
				Kind: m.Decision.Kind, WinningTeam: m.Decision.WinningTeam, TeamAScore: m.Decision.TeamAScore, TeamBScore: m.Decision.TeamBScore,
				ConfirmedAt: isoMs(m.Decision.ConfirmedAt),
			}
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *server) queueMatches(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	sess, err := s.session(r, q, club)
	if err != nil {
		return nil, err
	}
	matches, err := matchesOf(r, q, sess.ID)
	if err != nil {
		return nil, err
	}
	return struct {
		Matches       []queueMatchDTO `json:"matches"`
		QueueRevision string          `json:"queueRevision"`
		Revision      string          `json:"revision"`
	}{matches, httpapi.ToDecimalString(sess.QueueRevision), httpapi.ToDecimalString(sess.Revision)}, nil
}

// msTime is a JavaScript Date from its epoch milliseconds.
func msTime(ms int64) time.Time { return time.UnixMilli(ms).UTC() }
