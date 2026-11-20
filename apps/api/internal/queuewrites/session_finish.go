package queuewrites

import (
	"net/http"
	"strings"
	"unicode/utf16"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Session-level commands: Set end time and Extend (applySessionEnd in session-preparation.ts), Cancel session (session-cancel.ts) and Mark
// session invalid (finalization.ts invalidateSession). Session done (finalization) is not here: its route also drives the projection jobs
// that write result snapshots, player history and ranks (packages/db/src/player/projections.ts), which are not ported.

func (s *server) registerSessionFinish(rt *signedin.Router) {
	const session = "/api/sessions/{sessionId}"
	rt.Handle("POST "+session+"/end", store.AudienceClub, s.club(s.setSessionEnd))
	rt.Handle("POST "+session+"/extend", store.AudienceClub, s.club(s.extendSession))
	rt.Handle("POST "+session+"/cancel", store.AudienceClub, s.club(s.cancelSession))
	rt.Handle("POST "+session+"/invalid", store.AudienceClub, s.club(s.invalidateSession))
}

// jsTrim is String.prototype.trim: white space and line terminators, the byte order mark included.
func jsTrim(text string) string {
	return strings.TrimFunc(text, func(r rune) bool {
		switch r {
		case '\t', '\n', '\v', '\f', '\r', ' ', 0xa0, 0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff:
			return true
		}
		return r >= 0x2000 && r <= 0x200a
	})
}

// applySessionEnd is applySessionEnd: set the end under the session lock. Live: after now, at most 24 hours after the actual start. Prepared:
// the setup window. Then the court conflicts. The end it already has is returned unchanged (before the revision is checked), so a replay or a
// retry after a lost reply is repeat-safe. Courts that follow the session end (no open_until) move with it.
func (s *server) applySessionEnd(r *http.Request, club pgtype.UUID, endAt int64, expectedRevision string) (writes.Result, error) {
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "Only a prepared or running session can change its end.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		return t.setEnd(endAt, expectedRevision)
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

func (t *txn) setEnd(endAt int64, expectedRevision string) (any, error) {
	if endAt == t.sess.ScheduledEndAt.Time.UnixMilli() {
		return signedin.SessionOf(t.sess), nil
	}
	if err := requireRevision(t.sess.Revision, expectedRevision); err != nil {
		return nil, err
	}
	live, err := t.q.ListQueueSessionCourts(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	in := courts.SessionEndInput{ScheduledStartAt: t.sess.ScheduledStartAt.Time.UnixMilli(), EndAt: &endAt, Courts: modelCourts(live)}
	if t.sess.StartedAt.Valid {
		started := t.sess.StartedAt.Time.UnixMilli()
		in.StartedAt = &started
	}
	if msg, bad := courts.SessionEndError(in, t.s.at().UnixMilli()); bad {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"endAt": msg})
	}
	if err := t.q.SetQueueSessionEnd(t.ctx, sqlcgen.SetQueueSessionEndParams{ScheduledEndAt: timestamp(endAt), Now: t.stamp(), ID: t.sess.ID}); err != nil {
		return nil, err
	}
	updated, err := t.reload(t.sess.ID)
	if err != nil {
		return nil, err
	}
	if updated, err = t.recomputeMinimum(updated); err != nil {
		return nil, err
	}
	return signedin.SessionOf(updated), nil
}

// setSessionEnd is POST end, Courts and time › Set end time: endAt (ISO) at the displayed revision.
func (s *server) setSessionEnd(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	endAt, err := ms(body.Text("endAt"))
	if err != nil {
		return writes.Result{}, err
	}
	return s.applySessionEnd(r, club, endAt, body.Text("expectedRevision"))
}

// extendSession is POST extend, Courts and time › Extend 30 / 60 min: Set end time on the saved end plus the minutes. A retry after a lost
// reply would add the minutes again, so the revision stays required.
func (s *server) extendSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	minutes := body.Number("minutes")
	if minutes != 30 && minutes != 60 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"minutes": "Choose 30 or 60 minutes."})
	}
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "Only a prepared or running session can change its end.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		return t.setEnd(t.sess.ScheduledEndAt.Time.UnixMilli()+int64(minutes)*60_000, body.Text("expectedRevision"))
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

const cancelReasonMax = 120

// cancelSession is POST cancel, Q-PREPARE / D-CANCEL-SESSION: prepared to cancelled, final. {reason} is optional (a string up to 120
// characters, or null). The pending join requests close, the open match requests and drop-out notices close, and the reservation is
// released; the roster, waitlist and payment marks stay, read-only. A retry on a cancelled session returns it unchanged.
func (s *server) cancelSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	var reason pgtype.Text
	switch v := body["reason"].(type) {
	case nil:
	case string:
		if trimmed := jsTrim(v); trimmed != "" {
			if len(utf16.Encode([]rune(trimmed))) > cancelReasonMax {
				return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"reason": "Keep the reason to 120 characters."})
			}
			reason = pgtype.Text{String: trimmed, Valid: true}
		}
	default:
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	out, err := s.lockedSession(r.Context(), club, r.PathValue("sessionId"), false, func(t *txn) (any, error) {
		if t.sess.State == sqlcgen.QueueSessionStateCancelled {
			return signedin.SessionOf(t.sess), nil
		}
		if err := t.requireSessionAccess(); err != nil {
			return nil, err
		}
		if t.sess.State != sqlcgen.QueueSessionStatePrepared {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"state": "Only a session that has not started can be cancelled."})
		}
		now := t.stamp()
		if _, err := t.q.CloseQueueJoinRequestsAtStart(t.ctx, sqlcgen.CloseQueueJoinRequestsAtStartParams{Now: now, ClubID: t.club, SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		if err := t.closeSessionMatchRequests(now); err != nil {
			return nil, err
		}
		if err := t.q.DeleteQueueSessionReservations(t.ctx, sqlcgen.DeleteQueueSessionReservationsParams{ClubID: t.club, SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		if err := t.q.CancelQueueSession(t.ctx, sqlcgen.CancelQueueSessionParams{Now: now, CancelReason: reason, ID: t.sess.ID}); err != nil {
			return nil, err
		}
		updated, err := t.reload(t.sess.ID)
		return signedin.SessionOf(updated), err
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

// closeSessionMatchRequests is closeSessionMatchRequests: finishing, invalidating or cancelling a session closes every open match request
// (kept, hidden) and every open drop-out notice (closed with no decision).
func (t *txn) closeSessionMatchRequests(now pgtype.Timestamptz) error {
	if err := t.q.CloseOpenDropOutNotices(t.ctx, sqlcgen.CloseOpenDropOutNoticesParams{Now: now, SessionID: t.sess.ID}); err != nil {
		return err
	}
	return t.q.CloseOpenMatchRequests(t.ctx, sqlcgen.CloseOpenMatchRequestsParams{Now: now, SessionID: t.sess.ID})
}

type invalidReply struct {
	State         string  `json:"state"`
	InvalidReason *string `json:"invalidReason"`
	At            string  `json:"at,omitempty"`
}

// invalidateSession is POST invalid, Q-DONE Mark session invalid: no finalization, facts or official contribution; the reservation is
// released. Refused while a match is active and after Session done. A retry of an invalid session returns it unchanged. No database error
// is mapped here (a cancelled session cannot become invalid: the database refuses and the answer is a 500).
func (s *server) invalidateSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	reason := jsTrim(body.Text("reason"))
	if reason == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"reason": "Say why this session is invalid."})
	}
	out, err := s.lockedSession(r.Context(), club, r.PathValue("sessionId"), false, func(t *txn) (any, error) {
		switch t.sess.State {
		case sqlcgen.QueueSessionStateInvalid:
			return invalidReply{State: "invalid", InvalidReason: textPtrOf(t.sess.InvalidReason)}, nil
		case sqlcgen.QueueSessionStateCompleted, sqlcgen.QueueSessionStateFinalizing:
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"state": "A finished session can’t be marked invalid."})
		}
		if err := t.requireSessionAccess(); err != nil {
			return nil, err
		}
		active, err := t.q.CountActiveMatches(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		if active > 0 {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"matches": "Finish or mark invalid every active match first."})
		}
		now := t.stamp()
		if err := t.q.RemoveAllWaitingMatches(t.ctx, sqlcgen.RemoveAllWaitingMatchesParams{Now: now, SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		if err := t.closeSessionMatchRequests(t.stamp()); err != nil {
			return nil, err
		}
		if err := t.q.InvalidateQueueSession(t.ctx, sqlcgen.InvalidateQueueSessionParams{Now: t.stamp(), InvalidReason: pgtype.Text{String: reason, Valid: true}, ID: t.sess.ID}); err != nil {
			return nil, err
		}
		if err := t.q.DeleteQueueSessionReservations(t.ctx, sqlcgen.DeleteQueueSessionReservationsParams{ClubID: t.club, SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		return invalidReply{State: "invalid", InvalidReason: &reason, At: httpapi.ToIso(t.s.at())}, nil
	})
	return writes.Result{Body: out}, err
}

func textPtrOf(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}
