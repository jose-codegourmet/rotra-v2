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

// I can't make it, the Queue Master's side (packages/db/src/queue/drop-out-notices.ts, D-2026-11-09-03): the open notices a signed-in
// Player sent before the start are closed by Keep (the Player stays on the roster) or Remove from roster (the entry is released in the
// same transaction).

func (s *server) registerDropOuts(rt *signedin.Router) {
	const base = "/api/sessions/{sessionId}/requests/drop-outs/{noticeId}"
	rt.Handle("POST "+base+"/keep", store.AudienceClub, s.club(s.keepDropOut))
	rt.Handle("POST "+base+"/remove", store.AudienceClub, s.club(s.removeDropOut))
}

// noticeCommand is noticeCommand: the notice of this session, still open on an entry still held, decided in one transaction. A
// malformed notice id is not found.
func (s *server) noticeCommand(r *http.Request, club pgtype.UUID, decide func(t *txn, notice sqlcgen.GetDropOutNoticeInSessionRow) (any, error)) (writes.Result, error) {
	noticeID, err := rowIDStrict(r.PathValue("noticeId"))
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		notice, err := t.q.GetDropOutNoticeInSession(t.ctx, sqlcgen.GetDropOutNoticeInSessionParams{ID: noticeID, SessionID: t.sess.ID})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return nil, err
		}
		if notice.Status != sqlcgen.DropOutNoticeStatusOpen || notice.EntryReleasedAt.Valid {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"notice": "This notice is already closed."})
		}
		return decide(t, notice)
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

type noticeAnswer struct {
	NoticeID string `json:"noticeId"`
	Name     string `json:"name"`
}

// keepDropOut is POST keep: the notice closes as kept.
func (s *server) keepDropOut(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.noticeCommand(r, club, func(t *txn, n sqlcgen.GetDropOutNoticeInSessionRow) (any, error) {
		if err := t.q.CloseDropOutNotice(t.ctx, sqlcgen.CloseDropOutNoticeParams{Decision: sqlcgen.DropOutNoticeDecisionKept, Now: t.stamp(), ID: n.ID}); err != nil {
			return nil, err
		}
		return noticeAnswer{NoticeID: n.ID.String(), Name: n.NameSnapshot}, nil
	})
}

// removeDropOut is POST remove: the notice closes as removed and the entry is released (reason removed), as a prepared roster's
// Remove does. Notices are sent before the start, so a session that has started refuses it.
func (s *server) removeDropOut(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.noticeCommand(r, club, func(t *txn, n sqlcgen.GetDropOutNoticeInSessionRow) (any, error) {
		if t.sess.State != sqlcgen.QueueSessionStatePrepared {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"state": "The session has started. Use No show or Move to waitlist on the roster."})
		}
		if err := t.removeRosterPlayerIn(n.SessionPlayerID.String()); err != nil {
			return nil, err
		}
		if err := t.q.CloseDropOutNotice(t.ctx, sqlcgen.CloseDropOutNoticeParams{Decision: sqlcgen.DropOutNoticeDecisionRemoved, Now: t.stamp(), ID: n.ID}); err != nil {
			return nil, err
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		if _, err := t.recomputeMinimum(touched); err != nil {
			return nil, err
		}
		return noticeAnswer{NoticeID: n.ID.String(), Name: n.NameSnapshot}, nil
	})
}
