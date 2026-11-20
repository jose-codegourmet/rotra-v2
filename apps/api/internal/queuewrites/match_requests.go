package queuewrites

import (
	"errors"
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/matchrequest"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The Queue Master's side of the match requests (packages/db/src/queue/match-requests.ts, Q18.12): Add to queue and Decline.

const requestAlreadyClosed = "This match request is already closed."

func (s *server) registerMatchRequests(rt *signedin.Router) {
	const base = "/api/sessions/{sessionId}/match-requests/{requestId}"
	rt.Handle("POST "+base+"/add", store.AudienceClub, s.club(s.addMatchRequest))
	rt.Handle("POST "+base+"/decline", store.AudienceClub, s.club(s.declineMatchRequest))
}

// openRequest is openRequestIn: anyone named who stopped being present closes the request first (it never reopens), then the
// request of this session is read with its spots. A malformed id is not found.
func (t *txn) openRequest(requestText string) (sqlcgen.SessionMatchRequest, matchrequest.Request, error) {
	id, err := rowIDStrict(requestText)
	if err != nil {
		return sqlcgen.SessionMatchRequest{}, matchrequest.Request{}, err
	}
	if _, err := t.q.CloseStaleQueueMatchRequests(t.ctx, sqlcgen.CloseStaleQueueMatchRequestsParams{Now: t.stamp(), SessionID: t.sess.ID}); err != nil {
		return sqlcgen.SessionMatchRequest{}, matchrequest.Request{}, err
	}
	row, err := t.q.GetMatchRequestInSession(t.ctx, sqlcgen.GetMatchRequestInSessionParams{ID: id, SessionID: t.sess.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, matchrequest.Request{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return row, matchrequest.Request{}, err
	}
	spots, err := t.q.ListMatchRequestSpots(t.ctx, row.ID)
	if err != nil {
		return row, matchrequest.Request{}, err
	}
	return row, requestShape(row, spots), nil
}

// requestShape is requestShape: the roster ids, one entry per spot in slot order, nil for Anyone.
func requestShape(row sqlcgen.SessionMatchRequest, spots []sqlcgen.SessionMatchRequestSpot) matchrequest.Request {
	r := matchrequest.Request{PID: row.SessionPlayerID.String(), Format: model.Format(row.Format)}
	for _, s := range spots {
		var id *string
		if s.SessionPlayerID.Valid {
			text := s.SessionPlayerID.String()
			id = &text
		}
		if s.Side == sqlcgen.MatchRequestSidePartner {
			r.Partners = append(r.Partners, id)
		} else {
			r.Opponents = append(r.Opponents, id)
		}
	}
	return r
}

func requireOpenRequest(row sqlcgen.SessionMatchRequest) error {
	if row.Status != sqlcgen.MatchRequestStatusOpen {
		return writes.Fail(httpapi.ErrConflict, map[string]string{"request": requestAlreadyClosed})
	}
	return nil
}

// addAnswer is what Add to queue answers: the match command's result and queue revision, and the matches Auto Queue placed.
type addAnswer struct {
	commandDone
	AutoPlaced []signedin.Match `json:"autoPlaced"`
}

// addMatchRequest is POST add: a protected waiting match at the end of the Main Queue (the next match number and queue position),
// its lineup from the request, the request becomes added with the match; then Auto Queue, as after any add. Repeat-safe: the match is
// keyed on an operation derived from the request, so a retry answers the same match.
func (s *server) addMatchRequest(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	autoPlaced := []signedin.Match{}
	done, err := s.matchCommand(&txnRequest{ctx: r.Context(), club: club, sessionID: r.PathValue("sessionId")}, func(t *txn) (any, error) {
		row, shape, err := t.openRequest(r.PathValue("requestId"))
		if err != nil {
			return nil, err
		}
		if row.Status == sqlcgen.MatchRequestStatusAdded && row.MatchID.Valid {
			return t.matchOf(row.MatchID)
		}
		if err := requireOpenRequest(row); err != nil {
			return nil, err
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		// requestLineup reads each player's games adjustment from the stored roster.
		adjusted := make(map[string]int64, len(state.stored))
		for _, e := range state.stored {
			adjusted[e.ID.String()] = int64(e.GamesAdjustment)
		}
		roster := slices.Clone(state.Roster)
		for i := range roster {
			roster[i].GamesAdjustment = model.Some(adjusted[roster[i].ID])
		}
		lineup, ok := matchrequest.Lineup(shape, roster, state.Matches)
		if !ok {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"request": matchrequest.NotEnoughToFillText(matchrequest.FormatLabel(shape.Format))})
		}
		operationID := derivedID(row.ID.String(), "match-request:add").String()
		matchID, err := t.appendMatch(state.rosterIDs(), lineup, lineupInput{operationID: operationID, origin: sqlcgen.MatchOriginManual, manualProtected: true})
		if err != nil {
			return nil, err
		}
		if err := t.q.DecideMatchRequest(t.ctx, sqlcgen.DecideMatchRequestParams{Status: sqlcgen.MatchRequestStatusAdded, MatchID: matchID, Now: t.stamp(), ID: row.ID}); err != nil {
			return nil, err
		}
		result, err := t.matchOf(matchID)
		if err != nil {
			return nil, err
		}
		autoPlaced, err = t.fillCourts(t.sess, operationID, fillOptions{})
		return result, err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Status: http.StatusCreated, Body: addAnswer{commandDone: done, AutoPlaced: autoPlaced}}, nil
}

// declineMatchRequest is POST decline: the request closes as declined, nothing is queued and the queue revision stays. It answers the
// requester's name and nickname for the toast (the club nickname first, then the nickname, D-2026-11-18-03). It is no match command:
// any session state is fine, and a request that is not open is a conflict.
func (s *server) declineMatchRequest(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		row, _, err := t.openRequest(r.PathValue("requestId"))
		if err != nil {
			return nil, err
		}
		if err := requireOpenRequest(row); err != nil {
			return nil, err
		}
		if err := t.q.DecideMatchRequest(t.ctx, sqlcgen.DecideMatchRequestParams{Status: sqlcgen.MatchRequestStatusDeclined, Now: t.stamp(), ID: row.ID}); err != nil {
			return nil, err
		}
		type requester struct {
			NameSnapshot     string  `json:"nameSnapshot"`
			NicknameSnapshot *string `json:"nicknameSnapshot"`
			ClubNickname     *string `json:"clubNickname"`
		}
		answer := struct {
			RequestID string    `json:"requestId"`
			Status    string    `json:"status"`
			Requester requester `json:"requester"`
		}{RequestID: row.ID.String(), Status: "declined", Requester: requester{NameSnapshot: "Player"}}
		entry, err := t.q.GetSessionPlayer(t.ctx, row.SessionPlayerID)
		if errors.Is(err, pgx.ErrNoRows) {
			return answer, nil
		}
		if err != nil {
			return nil, err
		}
		nick, clubNick, err := t.rosterNamesFor(entry.ClubPlayerID)
		if err != nil {
			return nil, err
		}
		answer.Requester = requester{NameSnapshot: entry.NameSnapshot, NicknameSnapshot: nick, ClubNickname: clubNick}
		return answer, nil
	})
	return writes.Result{Body: out}, err
}
