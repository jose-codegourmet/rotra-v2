package signedin

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Queue app's GET reads: ports of apps/queue/src/app/api/**/route.ts and packages/db/src/{admin,queue}/*.ts. Every
// one runs behind the pass check of the Queue app (handleAccountRequest('club', ...)), which lets only a provisioned,
// enabled club account through, and reads only that club's own data. The entitlement checks are not part of that
// wrapper: each TypeScript service makes its own (some none at all), so each Go read makes the same one.

// clubRead is the body of a Queue read: it returns the JSON body (status 200) or an error.
type clubRead func(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error)

// clubOption tunes one Queue route.
type clubOption func(*clubRoute)

type clubRoute struct{ fillInvite bool }

// withInviteFill makes the route give a club with no invite code its first one before reading, as readClubInvite does.
func withInviteFill(o *clubRoute) { o.fillInvite = true }

// club is handleAccountRequest('club', ...): the pass is checked for the Queue app, then fn reads on one snapshot.
func (s *server) club(fn clubRead, opts ...clubOption) http.Handler {
	var route clubRoute
	for _, o := range opts {
		o(&route)
	}
	run := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, ok := session.PrincipalFrom(r.Context())
		if !ok {
			httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
			return
		}
		club := pgtype.UUID{Bytes: p.AccountID, Valid: true}
		if route.fillInvite {
			if err := s.ensureInviteCode(r.Context(), club); err != nil {
				s.write(w, r, err)
				return
			}
		}
		var body any
		err := readTx(r.Context(), s.pool, func(q *sqlcgen.Queries) (err error) {
			body, err = fn(r, q, club)
			return err
		})
		if err != nil {
			s.write(w, r, err)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
	})
	return s.auth.Require(store.AudienceClub, session.ModeRead)(run)
}

// registerQueue adds the Queue app's reads. A path that another app answers too (players, clubs) is routed per app.
func (s *server) registerQueue(rt *Router) {
	club := store.AudienceClub
	rt.Handle("GET /api/club", club, s.club(s.queueClub, withInviteFill))
	rt.Handle("GET /api/club/invite", club, s.club(s.queueInvite, withInviteFill))
	rt.Handle("GET /api/venues", club, s.club(s.queueVenues))
	rt.Handle("GET /api/inventory", club, s.club(s.queueInventory))
	rt.Handle("GET /api/license", club, s.club(s.queueLicense))
	rt.Handle("GET /api/club/players", club, s.club(s.queueClubPlayers))
	rt.Handle("GET /api/club/players/{clubPlayerId}", club, s.club(s.queueClubPlayerDetails))
	rt.Handle("GET /api/club/players/{clubPlayerId}/delete-impact", club, s.club(s.queueDeleteImpact))
	rt.Handle("GET /api/club/players/{clubPlayerId}/year-stats", club, s.club(s.queueYearStats))
	rt.Handle("GET /api/players", club, s.club(s.queuePlayerLookup))
	s.registerQueueSessions(rt)
}

// requireClubEntitlement is requireClubEntitlement: the club's entitlement row must record an access end after now. No
// row, no end and an end at or before now are all entitlement_required. JavaScript compares whole milliseconds.
func requireClubEntitlement(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, now time.Time) error {
	end, err := q.GetClubAccessEnd(ctx, club)
	if errors.Is(err, pgx.ErrNoRows) {
		return &serviceError{code: httpapi.ErrEntitlementRequired}
	}
	if err != nil {
		return err
	}
	if !end.Valid || !end.Time.Truncate(time.Millisecond).After(now.Truncate(time.Millisecond)) {
		return &serviceError{code: httpapi.ErrEntitlementRequired}
	}
	return nil
}
