package queuewrites

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the court commands of packages/db/src/queue/session-preparation.ts (addCourt, updateCourt, removeCourt,
// openCourtsEarly, undoCourtEarlyOpen) and their Route Handlers (apps/queue/src/app/api/sessions/[sessionId]/courts/**). They run
// on a prepared or running session, behind the same access check as the roster commands, and none of them maps database errors
// (addCourt only the insert of its court).

// errAutoFillPending is Auto Queue placing matches on a court that just opened or was added to a running session (autoFillCourts in
// match-control.ts). Match control is the next slice of the track; until it lands, a court command on a running session in Auto
// Queue stops here (a 500) instead of skipping the placement. A prepared session and a Manual Queue session never reach it.
var errAutoFillPending = errors.New("queuewrites: Auto Queue court fill is not ported yet (the match control slice)")

var courtsChanged = map[string]string{"court": "Something changed. Review the courts again."}

func (s *server) registerCourts(rt *signedin.Router) {
	const courts = "/api/sessions/{sessionId}/courts"
	rt.Handle("POST "+courts, store.AudienceClub, s.club(s.addCourt))
	rt.Handle("PATCH "+courts+"/{courtId}", store.AudienceClub, s.club(s.updateCourt))
	rt.Handle("DELETE "+courts+"/{courtId}", store.AudienceClub, s.club(s.removeCourt))
	rt.Handle("POST "+courts+"/open-early", store.AudienceClub, s.club(s.openAllCourtsEarly))
	rt.Handle("POST "+courts+"/{courtId}/open-early", store.AudienceClub, s.club(s.openCourtEarly))
	rt.Handle("DELETE "+courts+"/{courtId}/open-early", store.AudienceClub, s.club(s.undoCourtEarlyOpen))
}

// autoFillCourts is autoFillCourts for the courts a command opened: it places nothing outside a running Auto Queue session.
func (t *txn) autoFillCourts(session sqlcgen.LockQueueSessionRow) error {
	if session.State != sqlcgen.QueueSessionStateActive || session.CourtFillMode != sqlcgen.CourtFillModeAuto {
		return nil
	}
	return errAutoFillPending
}

// sessionBase is the session start courts count from: the actual start once live.
func sessionBase(s sqlcgen.LockQueueSessionRow) int64 {
	if s.StartedAt.Valid {
		return s.StartedAt.Time.UnixMilli()
	}
	return s.ScheduledStartAt.Time.UnixMilli()
}

func requireCourtState(t *txn) error {
	return requireState(t.sess, "Courts can change only before or during the session.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive)
}

// requireLiveCourt is requireLiveCourt: the live court of the locked session, or a conflict when it was removed meanwhile. The id
// is compared as text, so a malformed one is simply not there.
func (t *txn) requireLiveCourt(courtText string) (sqlcgen.SessionCourt, error) {
	live, err := t.q.ListQueueSessionCourts(t.ctx, t.sess.ID)
	if err != nil {
		return sqlcgen.SessionCourt{}, err
	}
	for _, c := range live {
		if c.ID.String() == courtText {
			return c, nil
		}
	}
	return sqlcgen.SessionCourt{}, writes.Fail(httpapi.ErrConflict, map[string]string{"court": "Court no longer available."})
}

// courtForm reads what the add and edit court forms send: the label, a planned start and an advisory end, each a string or none.
func courtForm(b writes.Body) (label string, startsAt, openUntil any) {
	if s, ok := b["startsAt"].(string); ok {
		startsAt = s
	}
	if s, ok := b["openUntil"].(string); ok {
		openUntil = s
	}
	return b.Text("label"), startsAt, openUntil
}

func courtLabel(label string) (string, error) {
	trimmed := fields.JSTrim(label)
	if trimmed == "" || utf16Len(trimmed) > courtLabelMax {
		return "", writes.Fail(httpapi.ErrInvalid, map[string]string{"court": "Enter a court label of at most 40 characters."})
	}
	return trimmed, nil
}

// addCourt is POST courts: a court with its planned start (none = the session start) and advisory end. Repeat-safe on courtId, which
// the client makes.
func (s *server) addCourt(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	label, startsAt, openUntil := courtForm(body)
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireCourtState(t); err != nil {
			return nil, err
		}
		courtID, ok := writes.ParseUUID(body.Text("courtId"))
		if !ok {
			return nil, errTypeError // Prisma refuses a court id that is no uuid
		}
		existing, err := t.q.GetSessionCourt(t.ctx, courtID)
		if err == nil {
			if existing.SessionID != t.sess.ID {
				return nil, writes.Fail(httpapi.ErrConflict, nil)
			}
			return map[string]any{"court": signedin.CourtOf(existing)}, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		trimmed, err := courtLabel(label)
		if err != nil {
			return nil, err
		}
		base := sessionBase(t.sess)
		planned, err := plannedStart(startsAt, base)
		if err != nil {
			return nil, err
		}
		var until *int64
		if truthy(openUntil) {
			at, err := ms(openUntil)
			if err != nil {
				return nil, err
			}
			until = &at
		}
		from := base
		if planned != nil {
			from = *planned
		}
		if msg, bad := courtWindowError(from, until, base, t.sess.ScheduledEndAt.Time.UnixMilli()); bad {
			return nil, writes.Fail(httpapi.ErrInvalid, msg)
		}
		court, err := t.q.InsertSessionCourt(t.ctx, sqlcgen.InsertSessionCourtParams{
			ID: courtID, ClubID: t.club, SessionID: t.sess.ID, Label: trimmed, StartsAt: nullableTimestamp(planned), OpenUntil: nullableTimestamp(until), Now: t.stamp(),
		})
		if err != nil {
			return nil, mapDatabaseError(err)
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		if _, err := t.recomputeMinimum(touched); err != nil {
			return nil, err
		}
		// Auto Queue: a court added to a running session fills now if it is open (never while prepared).
		if err := t.autoFillCourts(touched); err != nil {
			return nil, err
		}
		return map[string]any{"court": signedin.CourtOf(court)}, nil
	})
	return writes.Result{Status: http.StatusCreated, Body: out}, err
}

// updateCourt is PATCH courts/{courtId}, Add / Edit court Save: label, planned start and advisory end. The start is fixed once the
// court has hosted a match or been opened early; the end and the label stay editable.
func (s *server) updateCourt(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	label, startsAt, openUntil := courtForm(body)
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireCourtState(t); err != nil {
			return nil, err
		}
		court, err := t.requireLiveCourt(r.PathValue("courtId"))
		if err != nil {
			return nil, err
		}
		trimmed, err := courtLabel(label)
		if err != nil {
			return nil, err
		}
		base := sessionBase(t.sess)
		current := base
		if court.StartsAt.Valid {
			current = court.StartsAt.Time.UnixMilli()
		}
		start := base
		if truthy(startsAt) {
			if start, err = ms(startsAt); err != nil {
				return nil, err
			}
		}
		used := court.OpenedEarlyAt.Valid
		if !used {
			n, err := t.q.CountMatchCourtUsage(t.ctx, sqlcgen.CountMatchCourtUsageParams{ClubID: t.club, CourtID: court.ID})
			if err != nil {
				return nil, err
			}
			used = n > 0
		}
		if used && start != current {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"startsAt": "Start is fixed after use."})
		}
		var until *int64
		if truthy(openUntil) {
			at, err := ms(openUntil)
			if err != nil {
				return nil, err
			}
			until = &at
		}
		// A court opened before an early actual start keeps its own start as the earliest bound.
		earliest := base
		if court.StartsAt.Valid {
			earliest = min(base, court.StartsAt.Time.UnixMilli())
		}
		if msg, bad := courtWindowError(start, until, earliest, t.sess.ScheduledEndAt.Time.UnixMilli()); bad {
			return nil, writes.Fail(httpapi.ErrInvalid, msg)
		}
		var planned *int64
		if start != base {
			planned = &start
		}
		updated, err := t.q.EditSessionCourt(t.ctx, sqlcgen.EditSessionCourtParams{
			Label: trimmed, StartsAt: nullableTimestamp(planned), OpenUntil: nullableTimestamp(until), Now: t.stamp(), ClubID: t.club, SessionID: t.sess.ID, ID: court.ID,
		})
		if err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return map[string]any{"court": signedin.CourtOf(updated)}, nil
	})
	return writes.Result{Body: out}, err
}

// removeCourt is DELETE courts/{courtId}: a soft remove that keeps at least one court. A court an On court or Playing match holds
// cannot go. A court that is not there answers null.
func (s *server) removeCourt(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	_, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireCourtState(t); err != nil {
			return nil, err
		}
		live, err := t.q.ListQueueSessionCourts(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		var court *sqlcgen.SessionCourt
		for i := range live {
			if live[i].ID.String() == r.PathValue("courtId") {
				court = &live[i]
			}
		}
		if court == nil {
			return nil, nil
		}
		held, err := t.q.CourtIsHeld(t.ctx, court.ID)
		if err != nil {
			return nil, err
		}
		if held {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"court": "Only a free court can be removed"})
		}
		if len(live) <= 1 {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"court": "At least one court must remain."})
		}
		if err := t.q.RemoveSessionCourt(t.ctx, sqlcgen.RemoveSessionCourtParams{Now: t.stamp(), ID: court.ID}); err != nil {
			return nil, err
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		_, err = t.recomputeMinimum(touched)
		return nil, err
	})
	return writes.Result{Body: map[string]any{"court": nil}}, err
}

// notOpenYet is a planned start still ahead and not opened early.
func notOpenYet(c sqlcgen.SessionCourt, now int64) bool {
	if c.OpenedEarlyAt.Valid {
		return false
	}
	return c.StartsAt.Valid && c.StartsAt.Time.UnixMilli() > now
}

// openCourtsEarly is openCourtsEarly: each court not open yet opens now (a nil courtID is all of them). The planned start, costs and
// minimum games stay. Repeat-safe for one court: a court already opened early is answered as it is.
func (t *txn) openCourtsEarly(courtText *string) ([]sqlcgen.SessionCourt, error) {
	if err := requireState(t.sess, "Courts open early only during the session.", sqlcgen.QueueSessionStateActive); err != nil {
		return nil, err
	}
	now := t.s.at().UnixMilli()
	live, err := t.q.ListQueueSessionCourts(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	var courts []sqlcgen.SessionCourt
	for _, c := range live {
		if notOpenYet(c, now) {
			courts = append(courts, c)
		}
	}
	if courtText != nil {
		court, err := t.requireLiveCourt(*courtText)
		if err != nil {
			return nil, err
		}
		if court.OpenedEarlyAt.Valid {
			return []sqlcgen.SessionCourt{court}, nil
		}
		if !notOpenYet(court, now) {
			return nil, writes.Fail(httpapi.ErrConflict, courtsChanged)
		}
		courts = []sqlcgen.SessionCourt{court}
	}
	if len(courts) == 0 {
		return nil, writes.Fail(httpapi.ErrConflict, courtsChanged)
	}
	opened := make([]sqlcgen.SessionCourt, 0, len(courts))
	for _, c := range courts {
		o, err := t.q.SetSessionCourtEarlyOpen(t.ctx, sqlcgen.SetSessionCourtEarlyOpenParams{OpenedEarlyAt: timestamp(now), Now: t.stamp(), ID: c.ID})
		if err != nil {
			return nil, err
		}
		opened = append(opened, o)
	}
	if _, err := t.touch(); err != nil {
		return nil, err
	}
	// Auto Queue: the courts that just opened get the next eligible matches, in the same transaction.
	return opened, t.autoFillCourts(t.sess)
}

func courtsOf(rows []sqlcgen.SessionCourt) []signedin.Court {
	out := make([]signedin.Court, len(rows))
	for i, c := range rows {
		out[i] = signedin.CourtOf(c)
	}
	return out
}

// openAllCourtsEarly is POST courts/open-early: Open all courts now.
func (s *server) openAllCourtsEarly(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		opened, err := t.openCourtsEarly(nil)
		return map[string]any{"courts": courtsOf(opened)}, err
	})
	return writes.Result{Body: out}, err
}

// openCourtEarly is POST courts/{courtId}/open-early, Court card Start anyway. Repeat-safe.
func (s *server) openCourtEarly(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	courtText := r.PathValue("courtId")
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		opened, err := t.openCourtsEarly(&courtText)
		if err != nil {
			return nil, err
		}
		return map[string]any{"court": signedin.CourtOf(opened[0])}, nil
	})
	return writes.Result{Body: out}, err
}

// undoCourtEarlyOpen is DELETE courts/{courtId}/open-early: back to Not open yet while the court is free, and only before its planned
// start. Repeat-safe: a court already not open yet is answered as it is.
func (s *server) undoCourtEarlyOpen(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "Courts open early only during the session.", sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		now := t.s.at().UnixMilli()
		court, err := t.requireLiveCourt(r.PathValue("courtId"))
		if err != nil {
			return nil, err
		}
		if notOpenYet(court, now) {
			return map[string]any{"court": signedin.CourtOf(court)}, nil
		}
		startsAt := int64(0)
		if court.StartsAt.Valid {
			startsAt = court.StartsAt.Time.UnixMilli()
		}
		if !court.OpenedEarlyAt.Valid || startsAt <= now {
			return nil, writes.Fail(httpapi.ErrConflict, courtsChanged)
		}
		held, err := t.q.CourtIsHeld(t.ctx, court.ID)
		if err != nil {
			return nil, err
		}
		if held {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"court": "Only a free court can go back to Not open yet."})
		}
		updated, err := t.q.SetSessionCourtEarlyOpen(t.ctx, sqlcgen.SetSessionCourtEarlyOpenParams{Now: t.stamp(), ID: court.ID})
		if err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return map[string]any{"court": signedin.CourtOf(updated)}, nil
	})
	return writes.Result{Body: out}, err
}
