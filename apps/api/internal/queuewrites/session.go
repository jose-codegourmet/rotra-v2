package queuewrites

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionsetup"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// txn is what a command runs on: the transaction's queries, the club and the session as it was when it was locked. The
// session is not refreshed by the command's own writes (the TypeScript passes the same object around too); the lock
// guarantees nobody else changed it.
type txn struct {
	ctx  context.Context
	q    *sqlcgen.Queries
	s    *server
	club pgtype.UUID
	sess sqlcgen.LockQueueSessionRow
}

// stamp is `new Date()` for a row, at the moment of the call.
func (t *txn) stamp() pgtype.Timestamptz { return t.s.stamp() }

// parseSessionID reads the session ID of the path. The TypeScript sends it to a raw query that casts it to a uuid, so a
// malformed one crashes there (a 500). Go answers not found: no session can have that ID (a logged deviation).
func parseSessionID(text string) (pgtype.UUID, error) {
	id, ok := writes.ParseUUID(text)
	if !ok {
		return pgtype.UUID{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return id, nil
}

// parseOperationID reads an operation id as Postgres reads a uuid. A malformed or missing one is not found, as it is in the
// TypeScript, where the id reaches Postgres (22P02) and isMalformedId answers 404 (main #1108; owner answer, 2026-11-27).
func parseOperationID(text string) (pgtype.UUID, error) { return parseRowID(text) }

// parseRowID reads the ID of a row in a body (a roster entry, a request, a saved player). A malformed one is not found:
// the TypeScript crashes on it (a 500), and no row can have that ID.
func parseRowID(text string) (pgtype.UUID, error) {
	id, ok := writes.ParseUUID(text)
	if !ok {
		return pgtype.UUID{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return id, nil
}

// inSession runs change in one transaction on the club's session: lockSession (the row, FOR UPDATE; another club's and an
// unknown ID are not found), then requireSessionAccess. A database error comes back as it is: a command that maps them (as
// rosterCommand does) calls mapDatabaseError itself.
func (s *server) inSession(ctx context.Context, club pgtype.UUID, sessionID string, change func(t *txn) (any, error)) (any, error) {
	return s.lockedSession(ctx, club, sessionID, true, change)
}

// lockedSession is inSession with the access check optional: create, edit, start and delete check the club's entitlement before the
// transaction and never read requireSessionAccess's live-session exception, so they lock without it.
func (s *server) lockedSession(ctx context.Context, club pgtype.UUID, sessionID string, access bool, change func(t *txn) (any, error)) (any, error) {
	id, err := parseSessionID(sessionID)
	if err != nil {
		return nil, err
	}
	var out any
	err = writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		sess, err := q.LockQueueSession(ctx, sqlcgen.LockQueueSessionParams{ClubID: club, ID: id})
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		t := &txn{ctx: ctx, q: q, s: s, club: club, sess: sess}
		if access {
			if err := t.requireSessionAccess(); err != nil {
				return err
			}
		}
		out, err = change(t)
		if err == nil {
			// Whatever the command did, the session changed: its screens re-read (B-26). The lock above is held to the commit.
			liveupdates.Note(ctx, club, id)
		}
		return err
	})
	return out, err
}

// rosterCommand is rosterCommand: change runs on a locked, prepared or active session. Every roster change closes the match
// requests that name someone no longer present, bumps the session revision and recomputes a calculated minimum.
func (s *server) rosterCommand(ctx context.Context, club pgtype.UUID, sessionID string, change func(t *txn) (any, error)) (any, error) {
	out, err := s.inSession(ctx, club, sessionID, func(t *txn) (any, error) {
		if err := requireState(t.sess, "This session is closed.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		res, err := change(t)
		if err != nil {
			return nil, err
		}
		if err := t.finishRosterChange(); err != nil {
			return nil, err
		}
		return res, nil
	})
	// Only rosterCommand maps database errors in the TypeScript (its try/catch wraps the lock, the check and the change); another
	// command decides for itself.
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	return out, nil
}

// finishRosterChange is the tail of rosterCommand: closeStaleMatchRequests, touchSession, recomputeMinimum.
func (t *txn) finishRosterChange() error {
	if _, err := t.q.CloseStaleQueueMatchRequests(t.ctx, sqlcgen.CloseStaleQueueMatchRequestsParams{Now: t.stamp(), SessionID: t.sess.ID}); err != nil {
		return err
	}
	touched, err := t.touch()
	if err != nil {
		return err
	}
	_, err = t.recomputeMinimum(touched)
	return err
}

// reload is the session as it is stored now, with the columns the lock reads.
func (t *txn) reload(id pgtype.UUID) (sqlcgen.LockQueueSessionRow, error) {
	row, err := t.q.GetQueueSession(t.ctx, id)
	return sqlcgen.LockQueueSessionRow(row), err
}

// touch is touchSession: it bumps the revision of the locked session and answers it as stored now.
func (t *txn) touch() (sqlcgen.LockQueueSessionRow, error) {
	if err := t.q.TouchQueueSession(t.ctx, sqlcgen.TouchQueueSessionParams{Now: t.stamp(), ID: t.sess.ID}); err != nil {
		return sqlcgen.LockQueueSessionRow{}, err
	}
	return t.reload(t.sess.ID)
}

// requireSessionAccess is requireSessionAccess: an active session may keep running after the licence expires, but only under
// the term that authorized its start; every other session needs a current entitlement.
func (t *txn) requireSessionAccess() error {
	if t.sess.State == sqlcgen.QueueSessionStateActive && t.sess.StartLicenseTermID.Valid {
		return nil
	}
	return requireClubEntitlement(t.ctx, t.q, t.club, t.s.at())
}

// requireClubEntitlement is requireClubEntitlement: the club's entitlement row must record an access end after now. No row,
// no end and an end at or before now are all entitlement_required. JavaScript compares whole milliseconds.
func requireClubEntitlement(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, now time.Time) error {
	_, err := entitlementTerm(ctx, q, club, now)
	return err
}

// entitlementTerm is requireClubEntitlement keeping what it returns: the term the entitlement is effective under.
func entitlementTerm(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, now time.Time) (pgtype.UUID, error) {
	e, err := q.GetClubEntitlement(ctx, club)
	if errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, writes.Fail(httpapi.ErrEntitlementRequired, nil)
	}
	if err != nil {
		return pgtype.UUID{}, err
	}
	if !e.EffectiveAccessEndsAt.Valid || !e.EffectiveAccessEndsAt.Time.Truncate(time.Millisecond).After(now.Truncate(time.Millisecond)) {
		return pgtype.UUID{}, writes.Fail(httpapi.ErrEntitlementRequired, nil)
	}
	return e.EffectiveTermID, nil
}

// requireState is requireState: the session must be in one of the states, or `invalid` with the field state.
func requireState(sess sqlcgen.LockQueueSessionRow, message string, states ...sqlcgen.QueueSessionState) error {
	for _, st := range states {
		if sess.State == st {
			return nil
		}
	}
	return writes.Fail(httpapi.ErrInvalid, map[string]string{"state": message})
}

// requireRevision is requireRevision: the expected base revision of a command must match the stored one. The expected text
// is read the way BigInt reads it; a revision that is no number is invalid, a different one is a conflict.
func requireRevision(stored int64, expected string) error {
	return writes.RequireRevision(stored, expected)
}

// mapDatabaseError is mapDatabaseError: constraint failures become service errors, the database being the backstop for
// races. A unique violation is a conflict (P2002), a foreign key or restrict violation is invalid (P2003), and a row an update or a
// findUniqueOrThrow needed is not found (P2025). Anything else is unexpected, an exclusion violation too: Prisma reports it with no code
// of its own, so the TypeScript answers 500 where its mapDatabaseError looks for 23P01 (pinned by the start and court cases).
func mapDatabaseError(err error) error {
	var se *writes.Error
	if errors.As(err, &se) {
		return err
	}
	var pg *pgconn.PgError
	if errors.As(err, &pg) {
		switch pg.Code {
		case "23505":
			return writes.Fail(httpapi.ErrConflict, nil)
		case "23503", "23001":
			// A restrict violation (the level lock refusing a release) reaches the TypeScript as Prisma's P2003 too.
			return writes.Fail(httpapi.ErrInvalid, nil)
		}
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Fail(httpapi.ErrNotFound, nil)
	}
	return err
}

// recomputeMinimum is recomputeMinimum: while prepared with a calculated minimum, it is recomputed from the courts, the
// length, the players and the formats. sess is the session after touchSession; it comes back as stored now.
func (t *txn) recomputeMinimum(sess sqlcgen.LockQueueSessionRow) (sqlcgen.LockQueueSessionRow, error) {
	if sess.State != sqlcgen.QueueSessionStatePrepared || !sess.MinimumIsCalculated {
		return sess, nil
	}
	courts, err := t.q.CountQueueLiveCourts(t.ctx, sess.ID)
	if err != nil {
		return sess, err
	}
	count, err := t.q.CountQueueLiveRoster(t.ctx, sess.ID)
	if err != nil {
		return sess, err
	}
	// players: the roster count, else the expected players, else the slot capacity (JavaScript || skips 0 and null).
	players := int64(count)
	if players == 0 && sess.ExpectedPlayers.Valid {
		players = int64(sess.ExpectedPlayers.Int32)
	}
	if players == 0 {
		players = t.slotCapacity(int64(courts), sess.PlayersPerCourt)
	}
	low := sessionsetup.EstimateMinimum(sessionsetup.MinimumInput{
		Courts:  int64(courts),
		Minutes: sessionsetup.Minutes(sess.ScheduledStartAt.Time.UnixMilli(), sess.ScheduledEndAt.Time.UnixMilli()),
		Players: players, AllowSingles: sess.AllowSingles, AllowDoubles: sess.AllowDoubles,
	}).Low
	if int32(low) == sess.MinimumGames {
		return sess, nil
	}
	if err := t.q.SetQueueSessionMinimum(t.ctx, sqlcgen.SetQueueSessionMinimumParams{MinimumGames: int32(low), Now: t.stamp(), ID: sess.ID}); err != nil {
		return sess, err
	}
	return t.reload(sess.ID)
}

// slotCapacity is slotCapacity of the shared roster rules (version 1 until a session stamps its rules version).
func (t *txn) slotCapacity(courts int64, playersPerCourt int16) int64 {
	rs, err := rules.For(1)
	if err != nil {
		return courts * int64(playersPerCourt) // version 1 always exists
	}
	return rs.SlotCapacity(courts, int64(playersPerCourt))
}

// capacityOf is capacityOf: the live courts times the players per court.
func (t *txn) capacityOf() (int64, error) {
	courts, err := t.q.CountQueueLiveCourts(t.ctx, t.sess.ID)
	if err != nil {
		return 0, err
	}
	return t.slotCapacity(int64(courts), t.sess.PlayersPerCourt), nil
}
