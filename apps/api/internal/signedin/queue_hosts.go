package signedin

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The club's trusted hosts and a Queue Session's hosts (D-2026-11-22-01): GET /api/club/trusted-hosts and GET /api/sessions/{sessionId}/hosts. Ports of
// listTrustedHosts (packages/db/src/queue/club-hosts.ts) and listSessionHosts (session-hosts.ts). Neither checks the entitlement: a club that lapsed still
// reads its own hosts. The writes are in queuewrites.

func (s *server) registerQueueHosts(rt *Router) {
	club := store.AudienceClub
	rt.Handle("GET /api/club/trusted-hosts", club, s.club(s.queueTrustedHosts))
	rt.Handle("GET /api/sessions/{sessionId}/hosts", club, s.club(s.queueSessionHosts))
}

type trustedHostDTO struct {
	ID           string `json:"id"`
	ClubPlayerID string `json:"clubPlayerId"`
	AddedAt      string `json:"addedAt"`
}

// queueTrustedHosts is the club's current trusted hosts, oldest first. A saved player the club deleted, or moved into another saved player, is left
// out: the trusted-host row stays as history.
func (s *server) queueTrustedHosts(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	rows, err := q.ListQueueTrustedHosts(r.Context(), club)
	if err != nil {
		return nil, err
	}
	out := make([]trustedHostDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, trustedHostDTO{ID: row.ID.String(), ClubPlayerID: row.ClubPlayerID.String(), AddedAt: httpapi.ToIso(row.AddedAt.Time)})
	}
	return struct {
		TrustedHosts []trustedHostDTO `json:"trustedHosts"`
	}{out}, nil
}

type sessionHostDTO struct {
	ID           string `json:"id"`
	ClubPlayerID string `json:"clubPlayerId"`
	AssignedAt   string `json:"assignedAt"`
	Name         string `json:"name"`
}

// queueSessionHosts is the session's current hosts, oldest first. A finished session (completed or invalid) shows the rows frozen when it ended, by
// their snapshot name (#1008). Another club's session, an unknown one and a malformed id are not found.
func (s *server) queueSessionHosts(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	id, ok := parseUUIDString(r.PathValue("sessionId"))
	if !ok {
		return nil, errNotFound
	}
	sess, err := q.GetQueueSessionStateOfClub(r.Context(), sqlcgen.GetQueueSessionStateOfClubParams{ClubID: club, ID: id})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	ended := sess.State == sqlcgen.QueueSessionStateCompleted || sess.State == sqlcgen.QueueSessionStateInvalid
	rows, err := q.ListQueueSessionHosts(r.Context(), sqlcgen.ListQueueSessionHostsParams{ClubID: club, SessionID: id, Ended: ended})
	if err != nil {
		return nil, err
	}
	out := make([]sessionHostDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, sessionHostDTO{ID: row.ID.String(), ClubPlayerID: row.ClubPlayerID.String(), AssignedAt: httpapi.ToIso(row.AssignedAt.Time), Name: row.NameSnapshot})
	}
	return struct {
		Hosts []sessionHostDTO `json:"hosts"`
	}{out}, nil
}
