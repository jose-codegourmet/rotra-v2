package queuewrites

import (
	"errors"
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/matchrequest"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The signed-in Player's match request and Move me to the waitlist on a public session (packages/db/src/queue/match-requests.ts
// sendMatchRequest and cancelMatchRequest, public-session.ts movePlayerToWaitlist). They are called from the paired Queue origin like the
// other Player routes, so registerPublicSession wraps them the same way. A body that is not JSON answers 422 after the pass here; the Route
// Handlers read it before the pass and throw outside their handler (a Next 500 with no CORS headers), which a capture cannot record.

// sessionOfSlugForRequests is sessionBySlug of match-requests.ts: the session behind a public link; an unknown one and a removed public page
// (a deleted publication) are not found.
func (s *server) sessionOfSlugForRequests(r *http.Request) (pageSession, error) {
	row, err := sqlcgen.New(s.pool).GetSessionOfSlugWithPublication(r.Context(), r.PathValue("slug"))
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && row.PublicationState == "deleted") {
		return pageSession{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return pageSession{id: row.ID, club: row.ClubID}, err
}

// spotsOf is spotsOf: the picked players of one side. A missing field is none; anything but a list of roster ids (or null for Anyone) is invalid.
func spotsOf(body writes.Body, key string) ([]*string, error) {
	value, has := body[key]
	if !has {
		return nil, nil
	}
	list, ok := value.([]any)
	if !ok {
		return nil, invalid(key, "Pick players from this session.")
	}
	out := make([]*string, len(list))
	for i, v := range list {
		if v == nil {
			continue
		}
		id, isText := v.(string)
		if !isText || !strictUUID.MatchString(id) {
			return nil, invalid(key, "Pick players from this session.")
		}
		out[i] = &id
	}
	return out, nil
}

// sendMatchRequest is POST match-request, Q-PUBLIC-DETAILS Send request (D-2026-11-09-05): {requestId, format, partners, opponents} (roster ids
// or null for Anyone). 201 {matchRequestId, message}; repeat-safe on requestId.
func (s *server) sendMatchRequest(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	requestText := body.Text("requestId")
	if !strictUUID.MatchString(requestText) {
		return writes.Result{}, invalid("requestId", "Missing request id.")
	}
	format := model.Format(body.Text("format"))
	if !slices.Contains(matchrequest.FormatOrder, format) {
		return writes.Result{}, invalid("format", matchrequest.FormatNotAllowedText)
	}
	partnersIn, err := spotsOf(body, "partners")
	if err != nil {
		return writes.Result{}, err
	}
	opponentsIn, err := spotsOf(body, "opponents")
	if err != nil {
		return writes.Result{}, err
	}
	ps, err := s.sessionOfSlugForRequests(r)
	if err != nil {
		return writes.Result{}, err
	}
	player := playerOf(p)
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		requestID, err := parseRowID(requestText)
		if err != nil {
			return nil, err
		}
		done, err := t.q.GetMatchRequestWithPlayer(t.ctx, requestID)
		if err == nil {
			if done.SessionID != t.sess.ID || done.PlayerID != player {
				return nil, writes.Fail(httpapi.ErrConflict, nil)
			}
			return matchRequestAnswer{MatchRequestID: done.ID.String(), Message: "Match request sent"}, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if t.sess.State != sqlcgen.QueueSessionStateActive {
			return nil, invalid("request", "Match requests open when the session starts.")
		}
		allowed := matchrequest.AllowedFormats(t.sess.AllowSingles, signedin.SessionOf(t.sess).RequestFormats)
		if len(allowed) == 0 {
			return nil, invalid("request", matchrequest.NoMatchRequestsText)
		}
		if !slices.Contains(allowed, format) {
			return nil, invalid("format", matchrequest.FormatNotAllowedText)
		}
		row, err := t.q.GetOwnLiveEntryOfPlayer(t.ctx, sqlcgen.GetOwnLiveEntryOfPlayerParams{SessionID: t.sess.ID, PlayerID: player})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, invalid("player", notOnTheRosterText)
		}
		if err != nil {
			return nil, err
		}
		if !row.Present {
			return nil, invalid("player", "Check in first to request a match.")
		}
		now := t.stamp()
		if _, err := t.q.CloseStaleQueueMatchRequests(t.ctx, sqlcgen.CloseStaleQueueMatchRequestsParams{Now: now, SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		if _, err := t.q.GetOpenMatchRequestOfEntry(t.ctx, sqlcgen.GetOpenMatchRequestOfEntryParams{SessionID: t.sess.ID, SessionPlayerID: row.ID}); err == nil {
			return nil, conflict("request", "Match request sent · the QM decides")
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		nPartners, nOpponents := matchrequest.Spots(format)
		if len(partnersIn) > nPartners || len(opponentsIn) > nOpponents {
			return nil, invalid("request", "Too many players for this format.")
		}
		fit := func(ids []*string, n int) []*string {
			out := make([]*string, n)
			copy(out, ids)
			return out
		}
		partners, opponents := fit(partnersIn, nPartners), fit(opponentsIn, nOpponents)
		var named []string
		for _, id := range slices.Concat(partners, opponents) {
			if id != nil {
				named = append(named, *id)
			}
		}
		distinct := slices.Clone(append(named, row.ID.String()))
		slices.Sort(distinct)
		if len(slices.Compact(distinct)) != len(named)+1 {
			return nil, conflict("request", "Pick each player once.")
		}
		roster, err := t.q.ListQueueLiveRoster(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		present := map[string]bool{}
		for _, e := range roster {
			if e.Present {
				present[e.ID.String()] = true
			}
		}
		if slices.ContainsFunc(named, func(id string) bool { return !present[id] }) {
			return nil, conflict("request", "Present players only. Pick again.")
		}
		if err := t.q.InsertSessionMatchRequest(t.ctx, sqlcgen.InsertSessionMatchRequestParams{
			ID: requestID, ClubID: t.sess.ClubID, SessionID: t.sess.ID, SessionPlayerID: row.ID, Format: sqlcgen.MatchFormat(format), Now: now,
		}); err != nil {
			return nil, err
		}
		for _, side := range []struct {
			side sqlcgen.MatchRequestSide
			ids  []*string
		}{{sqlcgen.MatchRequestSidePartner, partners}, {sqlcgen.MatchRequestSideOpponent, opponents}} {
			for slot, id := range side.ids {
				spot := sqlcgen.InsertMatchRequestSpotParams{RequestID: requestID, ClubID: t.sess.ClubID, SessionID: t.sess.ID, Side: side.side, SlotNo: int16(slot)}
				if id != nil {
					if spot.SessionPlayerID, err = parseRowID(*id); err != nil {
						return nil, err
					}
				}
				if err := t.q.InsertMatchRequestSpot(t.ctx, spot); err != nil {
					return nil, err
				}
			}
		}
		return matchRequestAnswer{MatchRequestID: requestText, Message: "Match request sent"}, nil
	})
	return writes.Result{Status: http.StatusCreated, Body: out}, err
}

type matchRequestAnswer struct {
	MatchRequestID string `json:"matchRequestId"`
	Message        string `json:"message"`
}

// cancelMyMatchRequest is POST match-request/cancel, My night Cancel on the Player's open match request: it becomes cancelled. No state is
// checked and no database error is mapped, as in the TypeScript.
func (s *server) cancelMyMatchRequest(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlugForRequests(r)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inPageSession(r, ps, false, func(t *txn) (any, error) {
		var open pgtype.UUID
		entry, err := t.q.GetOwnLiveEntryOfPlayer(t.ctx, sqlcgen.GetOwnLiveEntryOfPlayerParams{SessionID: t.sess.ID, PlayerID: playerOf(p)})
		if err == nil {
			open, err = t.q.GetOpenMatchRequestOfEntry(t.ctx, sqlcgen.GetOpenMatchRequestOfEntryParams{SessionID: t.sess.ID, SessionPlayerID: entry.ID})
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, conflict("request", requestAlreadyClosed)
		}
		if err != nil {
			return nil, err
		}
		if err := t.q.CancelMatchRequest(t.ctx, sqlcgen.CancelMatchRequestParams{Now: t.stamp(), ID: open}); err != nil {
			return nil, err
		}
		return matchRequestAnswer{MatchRequestID: open.String(), Message: "Match request cancelled"}, nil
	})
	return writes.Result{Body: out}, err
}

type stepDownAnswer struct {
	ClubPlayerID string `json:"clubPlayerId"`
	Message      string `json:"message"`
}

// movePlayerToWaitlist is POST step-down, Q-PUBLIC-JOIN Move me to the waitlist (#735): the signed-in Player's own roster entry steps down to
// the front of the waitlist, with the Queue Master's rules. Refused (409) while they are in a waiting, On court or Playing match.
// Repeat-safe on operationId.
func (s *server) movePlayerToWaitlist(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op := body.Text("operationId")
	if op == "" {
		return writes.Result{}, invalid("operationId", "Missing operation id.")
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		if err := requireState(t.sess, "This session has finished.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		const moved = "You moved to the waitlist"
		if done, err := t.q.GetSessionWaitlistEntry(t.ctx, derivedID(op, "step-down")); err == nil {
			return stepDownAnswer{ClubPlayerID: done.ClubPlayerID.String(), Message: moved}, nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		entry, err := t.q.GetOwnLiveEntryOfPlayer(t.ctx, sqlcgen.GetOwnLiveEntryOfPlayerParams{SessionID: t.sess.ID, PlayerID: playerOf(p)})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, invalid("player", notOnTheRosterText)
		}
		if err != nil {
			return nil, err
		}
		result, err := t.stepDownIn(op, entry.ID.String(), func(string) string {
			return "You're in a match. Ask the Queue Master to finish or remove it first."
		})
		if err != nil {
			return nil, err
		}
		if _, err := t.q.CloseStaleQueueMatchRequests(t.ctx, sqlcgen.CloseStaleQueueMatchRequestsParams{Now: t.stamp(), SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		if _, err := t.recomputeMinimum(touched); err != nil {
			return nil, err
		}
		return stepDownAnswer{ClubPlayerID: result.ClubPlayerID, Message: moved}, nil
	})
	return writes.Result{Body: out}, err
}
