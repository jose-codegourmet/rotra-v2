package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/housekeeping"
)

// Retention deletes for B-34, shaped for housekeeping.Runner. Register the events cleanup first and the
// sessions cleanup after it: sessions are kept while an event still references them.
const (
	// The trigger auth_events_append_only refuses deletes unless this transaction-local flag is on.
	allowEventsDelete = `SELECT set_config('rotra.auth_events_retention', 'on', true)`

	deleteOldEvents = `DELETE FROM auth_events WHERE id IN (
  SELECT id FROM auth_events WHERE occurred_at < now() - make_interval(days => $1) ORDER BY id LIMIT $2)`

	// Ended = signed out, revoked or expired. A session an event still references is skipped (the foreign
	// key is RESTRICT), so one referenced row never fails a whole batch.
	deleteEndedSessions = `DELETE FROM auth_sessions WHERE id IN (
  SELECT s.id FROM auth_sessions s
  WHERE least(coalesce(s.revoked_at, s.expires_at), s.expires_at) < now() - make_interval(days => $1)
    AND NOT EXISTS (SELECT 1 FROM auth_events e WHERE e.session_id = s.id)
  ORDER BY s.id LIMIT $2)`
)

type beginner interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

// AuthEventsCleanup deletes auth_events older than days, one transaction per batch with the retention flag
// set locally. The Execer the runner passes must be able to begin a transaction (the *pgx.Conn it uses can).
func AuthEventsCleanup(days int) housekeeping.Cleanup {
	return housekeeping.Cleanup{Name: "auth_events", Delete: func(ctx context.Context, x housekeeping.Execer, limit int) (n int64, err error) {
		b, ok := x.(beginner)
		if !ok {
			return 0, errors.New("auth_events cleanup needs a connection that can begin a transaction")
		}
		tx, err := b.Begin(ctx)
		if err != nil {
			return 0, fmt.Errorf("beginning transaction: %w", err)
		}
		defer func() {
			if err != nil {
				_ = tx.Rollback(context.WithoutCancel(ctx))
			}
		}()
		if _, err = tx.Exec(ctx, allowEventsDelete); err != nil {
			return 0, fmt.Errorf("setting the retention flag: %w", err)
		}
		tag, err := tx.Exec(ctx, deleteOldEvents, days, limit)
		if err != nil {
			return 0, fmt.Errorf("deleting old events: %w", err)
		}
		if err = tx.Commit(ctx); err != nil {
			return 0, fmt.Errorf("committing: %w", err)
		}
		return tag.RowsAffected(), nil
	}}
}

// AuthSessionsCleanup deletes ended auth_sessions that ended more than days ago and that no auth_events row
// references any more.
func AuthSessionsCleanup(days int) housekeeping.Cleanup {
	return housekeeping.Cleanup{Name: "auth_sessions", Delete: func(ctx context.Context, x housekeeping.Execer, limit int) (int64, error) {
		tag, err := x.Exec(ctx, deleteEndedSessions, days, limit)
		return tag.RowsAffected(), err
	}}
}
