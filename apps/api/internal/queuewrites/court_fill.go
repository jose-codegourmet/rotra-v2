package queuewrites

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courtfill"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Auto Queue (packages/db/src/queue/match-control.ts: autoFillCourts, setCourtFillMode, fillOpenedCourts) and the two court-fill routes.
// fillCourts is the one fill every command that can trigger Auto Queue calls: the court-fill routes, Add match, Auto queue, Regenerate,
// Send back, Move, Team wins and Invalid, and the court commands (add a court, open early).

func (s *server) registerCourtFill(rt *signedin.Router) {
	const path = "/api/sessions/{sessionId}/court-fill"
	rt.Handle("PATCH "+path, store.AudienceClub, s.club(s.setCourtFillMode))
	rt.Handle("POST "+path, store.AudienceClub, s.club(s.fillOpenedCourts))
}

// fillOptions are the limits of one fill. Nil OnlyCourtIDs is every court; an empty, non-nil list is none.
type fillOptions struct {
	exceptMatchID  *string
	onlyCourtIDs   []string
	exceptCourtIDs []string
}

// fillCourts is autoFillCourts: when the locked session runs in Auto, each free open court (or only the named ones), in court order,
// gets the next eligible waiting match On court. It never starts a match; each placement is keyed on an operation derived from the
// trigger's, and the queue revision is bumped once when anything was placed. It answers the placed matches.
func (t *txn) fillCourts(sess sqlcgen.LockQueueSessionRow, operationID string, opts fillOptions) ([]signedin.Match, error) {
	placed := []signedin.Match{}
	if sess.State != sqlcgen.QueueSessionStateActive || sess.CourtFillMode != sqlcgen.CourtFillModeAuto {
		return placed, nil
	}
	state, err := t.matchContext()
	if err != nil {
		return nil, err
	}
	placements := courtfill.AutoFillPlacements(state.rules(t.s.at().UnixMilli()), courtfill.FillOptions{
		ExceptMatchID: opts.exceptMatchID, OnlyCourtIDs: opts.onlyCourtIDs, ExceptCourtIDs: opts.exceptCourtIDs,
	})
	if len(placements) == 0 {
		return placed, nil
	}
	now := t.stamp()
	for _, p := range placements {
		matchID, err := parseRowID(p.MatchID)
		if err != nil {
			return nil, err
		}
		courtID, err := parseRowID(p.CourtID)
		if err != nil {
			return nil, err
		}
		op := derivedID(operationID, "auto-fill:"+p.MatchID)
		if err := t.putOnCourt(matchID, state.stored, []pgtype.UUID{courtID}, op.String(), now); err != nil {
			return nil, err
		}
		m, err := t.matchOf(matchID)
		if err != nil {
			return nil, err
		}
		placed = append(placed, m)
	}
	if err := t.q.BumpQueueRevision(t.ctx, sqlcgen.BumpQueueRevisionParams{Now: t.stamp(), ID: sess.ID}); err != nil {
		return nil, err
	}
	return placed, nil
}

// courtFillAnswer is what the two court-fill routes answer inside the match command's result.
type courtFillAnswer struct {
	Mode   string           `json:"mode"`
	Placed []signedin.Match `json:"placed"`
}

// setCourtFillMode is PATCH court-fill: Manual Queue | Auto Queue, any time while the session runs. Turning Auto on fills every free
// open court now, in the same transaction. Setting the mode it already has changes nothing.
func (s *server) setCourtFillMode(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	mode := body.Text("mode")
	if mode != "manual" && mode != "auto" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"mode": "Choose Manual Queue or Auto Queue."})
	}
	done, err := s.matchCommand(&txnRequest{ctx: r.Context(), club: club, sessionID: r.PathValue("sessionId")}, func(t *txn) (any, error) {
		if string(t.sess.CourtFillMode) == mode {
			return courtFillAnswer{Mode: mode, Placed: []signedin.Match{}}, nil
		}
		if err := t.q.SetCourtFillMode(t.ctx, sqlcgen.SetCourtFillModeParams{CourtFillMode: sqlcgen.CourtFillMode(mode), Now: t.stamp(), ID: t.sess.ID}); err != nil {
			return nil, err
		}
		updated, err := t.reload(t.sess.ID)
		if err != nil {
			return nil, err
		}
		placed, err := t.fillCourts(updated, uuid.NewString(), fillOptions{})
		return courtFillAnswer{Mode: mode, Placed: placed}, err
	})
	return writes.Result{Body: done}, err
}

// fillOpenedCourts is POST court-fill: Auto Queue for courts that reached their planned opening time. Only the named courts, only in
// Auto Queue; ids that are not text are dropped, and a body with no list names no court.
func (s *server) fillOpenedCourts(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	ids := []string{}
	if list, ok := body["courtIds"].([]any); ok {
		for _, v := range list {
			if id, ok := v.(string); ok {
				ids = append(ids, id)
			}
		}
	}
	done, err := s.matchCommand(&txnRequest{ctx: r.Context(), club: club, sessionID: r.PathValue("sessionId")}, func(t *txn) (any, error) {
		placed, err := t.fillCourts(t.sess, uuid.NewString(), fillOptions{onlyCourtIDs: ids})
		return courtFillAnswer{Mode: string(t.sess.CourtFillMode), Placed: placed}, err
	})
	return writes.Result{Body: done}, err
}
