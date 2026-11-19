package signedin

import (
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// GET /api/sessions/{sessionId}/requests: the Requests read of a session (Q-REQUESTS). Port of readSessionRequests in
// packages/db/src/queue/match-requests.ts and openDropOutNotices in drop-out-notices.ts.
//
// The TypeScript locks the session and closes every open request that names someone who stopped being present before it
// reads. A read cannot write here: it filters the same requests out instead (liveOpenRequests reads them as closed even
// before the close is stored), so the answer is the same; the stored status is only updated by the next command that
// changes the roster. This is a deviation on persistence only.

type requestWhere struct {
	Kind        string  `json:"kind"`
	CourtLabels *string `json:"courtLabels,omitempty"`
	Position    *int    `json:"position,omitempty"`
}

type requestSpot struct {
	RosterID string        `json:"rosterId"`
	Name     string        `json:"name"`
	Nickname *string       `json:"nickname"`
	Level    *string       `json:"level"`
	Games    int           `json:"games"`
	Where    *requestWhere `json:"where"`
}

type queueMatchRequestDTO struct {
	ID        string         `json:"id"`
	Format    string         `json:"format"`
	At        string         `json:"at"`
	Requester requestSpot    `json:"requester"`
	Partners  []*requestSpot `json:"partners"`
	Opponents []*requestSpot `json:"opponents"`
}

type dropOutNoticeDTO struct {
	ID        string  `json:"id"`
	SessionID string  `json:"sessionId"`
	Pid       string  `json:"pid"`
	PlayerID  string  `json:"playerId"`
	At        string  `json:"at"`
	Status    string  `json:"status"`
	Decision  *string `json:"decision"`
	ClosedAt  *string `json:"closedAt"`
	Name      string  `json:"name"`
	Nickname  *string `json:"nickname"`
}

type requestCounts struct {
	Total        int `json:"total"`
	Join         int `json:"join"`
	JoinRequests int `json:"joinRequests"`
	DropOuts     int `json:"dropOuts"`
	Match        int `json:"match"`
}

func (s *server) queueRequests(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	sess, err := s.session(r, q, club)
	if err != nil {
		return nil, err
	}
	out := struct {
		SessionID   string                 `json:"sessionId"`
		Minimum     int32                  `json:"minimum"`
		Join        []struct{}             `json:"join"`
		DropOuts    []dropOutNoticeDTO     `json:"dropOuts"`
		SelfCheckIn map[string]struct{}    `json:"selfCheckIn"`
		Counts      requestCounts          `json:"counts"`
		Match       []queueMatchRequestDTO `json:"match"`
	}{SessionID: sess.ID.String(), Minimum: sess.MinimumGames, Join: []struct{}{}, DropOuts: []dropOutNoticeDTO{}, SelfCheckIn: map[string]struct{}{}, Match: []queueMatchRequestDTO{}}
	// Finished, invalid and cancelled sessions take no requests.
	if sess.State != sqlcgen.QueueSessionStatePrepared && sess.State != sqlcgen.QueueSessionStateActive && sess.State != sqlcgen.QueueSessionStateFinalizing {
		return out, nil
	}
	rosterRows, err := q.ListQueueRoster(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	var live []sqlcgen.ListQueueRosterRow
	present := map[string]bool{}
	for _, e := range rosterRows {
		if e.NoShowAt.Valid {
			continue
		}
		live = append(live, e)
		if e.Present {
			present[e.ID.String()] = true
		}
	}
	reqs, err := q.ListQueueOpenMatchRequests(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	spotRows, err := q.ListQueueMatchRequestSpots(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	partners, opponents := map[pgtype.UUID][]pgtype.UUID{}, map[pgtype.UUID][]pgtype.UUID{}
	for _, sp := range spotRows { // ordered by request, then slot
		if sp.Side == "partner" {
			partners[sp.RequestID] = append(partners[sp.RequestID], sp.SessionPlayerID)
		} else {
			opponents[sp.RequestID] = append(opponents[sp.RequestID], sp.SessionPlayerID)
		}
	}
	views, _, err := sessionMatchViews(r, q, sess.ID)
	if err != nil {
		return nil, err
	}
	courtRows, err := q.ListQueueLiveCourts(ctx, club)
	if err != nil {
		return nil, err
	}
	var courts []model.Court
	for _, c := range courtRows {
		if c.SessionID == sess.ID {
			courts = append(courts, model.Court{ID: c.ID.String(), SessionID: sess.ID.String(), Label: c.Label})
		}
	}
	byID := map[string]sqlcgen.ListQueueRosterRow{}
	for _, e := range live {
		byID[e.ID.String()] = e
	}
	var waiting []model.Match
	for _, m := range views {
		if m.State == "waiting" {
			waiting = append(waiting, m)
		}
	}
	sort.SliceStable(waiting, func(i, j int) bool { return waiting[i].QueuePosition < waiting[j].QueuePosition })
	spot := func(id string) *requestSpot {
		sp := &requestSpot{RosterID: id, Name: "Player", Games: match.CountedGames(id, views)}
		if e, ok := byID[id]; ok {
			nick, _ := rosterNames(e.ClubNickname, e.PlayerNickname, e.ProfileState)
			sp.Name, sp.Nickname, sp.Level = e.NameSnapshot, nick, levelOf(e.SkillLevelID)
		}
		for _, m := range views {
			if m.HoldsCourt() && contains(m.AllPlayers(), id) {
				labels := courtNames(m, courts)
				sp.Where = &requestWhere{Kind: "court", CourtLabels: &labels}
				return sp
			}
		}
		for i, m := range waiting {
			if contains(m.AllPlayers(), id) {
				pos := i + 1
				sp.Where = &requestWhere{Kind: "queue", Position: &pos}
				break
			}
		}
		return sp
	}
	named := func(ids []pgtype.UUID) []*requestSpot {
		res := []*requestSpot{}
		for _, id := range ids {
			if id.Valid {
				res = append(res, spot(id.String()))
			} else {
				res = append(res, nil)
			}
		}
		return res
	}
	for _, rq := range reqs {
		// liveOpenRequests: the requester and every named player must be present.
		ok := present[rq.SessionPlayerID.String()]
		for _, list := range [][]pgtype.UUID{partners[rq.ID], opponents[rq.ID]} {
			for _, id := range list {
				if id.Valid && !present[id.String()] {
					ok = false
				}
			}
		}
		if !ok {
			continue
		}
		out.Match = append(out.Match, queueMatchRequestDTO{
			ID: rq.ID.String(), Format: rq.Format, At: httpapi.ToIso(rq.RequestedAt.Time), Requester: *spot(rq.SessionPlayerID.String()),
			Partners: named(partners[rq.ID]), Opponents: named(opponents[rq.ID]),
		})
	}
	notices, err := q.ListQueueOpenDropOutNotices(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	for _, n := range notices {
		nick, _ := rosterNames(n.ClubNickname, n.PlayerNickname, n.ProfileState)
		out.DropOuts = append(out.DropOuts, dropOutNoticeDTO{
			ID: n.ID.String(), SessionID: n.SessionID.String(), Pid: n.SessionPlayerID.String(), PlayerID: n.PlayerID.String(),
			At: httpapi.ToIso(n.CreatedAt.Time), Status: "open", Name: n.NameSnapshot, Nickname: nick,
		})
	}
	out.Counts = requestCounts{Total: len(out.Match) + len(out.DropOuts), Join: len(out.DropOuts), DropOuts: len(out.DropOuts), Match: len(out.Match)}
	return out, nil
}

func contains(ids []string, id string) bool {
	for _, v := range ids {
		if v == id {
			return true
		}
	}
	return false
}
