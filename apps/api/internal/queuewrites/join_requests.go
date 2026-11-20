package queuewrites

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Confirm and decline a join request from the Requests tab (packages/db/src/queue/session-roster.ts: confirmJoinRequest and
// declineJoinRequest). The request is found first, outside the transaction, to know its session; then the same roster command the
// roster batch runs does the work (roster_requests.go).

func (s *server) registerJoinRequests(rt *signedin.Router) {
	rt.Handle("POST /api/join-requests/{requestId}/confirm", store.AudienceClub, s.club(s.confirmJoinRequest))
	rt.Handle("POST /api/join-requests/{requestId}/decline", store.AudienceClub, s.club(s.declineJoinRequest))
}

// sessionOfRequest is the session a request of this club belongs to; another club's, an unknown one and a malformed id are not found.
func (s *server) sessionOfRequest(r *http.Request, club pgtype.UUID) (string, error) {
	id, err := parseRowID(r.PathValue("requestId"))
	if err != nil {
		return "", err
	}
	req, err := sqlcgen.New(s.pool).GetQueueJoinRequestForUpdate(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && req.ClubID != club) {
		return "", writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return "", err
	}
	return req.SessionID.String(), nil
}

// confirmJoinRequest is POST confirm: the guest or Player becomes a saved player with a slot or a waitlist place. The level is checked
// before the request is looked up.
func (s *server) confirmJoinRequest(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	in := requestAccept{operationID: body.Text("operationId"), requestID: r.PathValue("requestId"), level: body.Text("level")}
	if _, err := levelID(in.level); err != nil {
		return writes.Result{}, err
	}
	sessionID, err := s.sessionOfRequest(r, club)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.rosterCommand(r.Context(), club, sessionID, func(t *txn) (any, error) { return t.confirmJoinRequestIn(in) })
	return writes.Result{Body: out}, err
}

// declineJoinRequest is POST decline. It reads no body.
func (s *server) declineJoinRequest(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	sessionID, err := s.sessionOfRequest(r, club)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.rosterCommand(r.Context(), club, sessionID, func(t *txn) (any, error) {
		d, err := t.declineJoinRequestIn(r.PathValue("requestId"), pgtype.UUID{})
		return struct {
			Request any `json:"request"`
		}{d}, err
	})
	return writes.Result{Body: out}, err
}
