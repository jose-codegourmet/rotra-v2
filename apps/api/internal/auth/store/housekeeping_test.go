package store_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/housekeeping"
)

func daysAgo(n int) time.Time {
	return time.Now().UTC().Add(-time.Duration(n) * 24 * time.Hour).Truncate(time.Microsecond)
}

func (e *env) countRows(t *testing.T, table string) int {
	t.Helper()
	var n int
	if err := e.pool.QueryRow(e.ctx, "SELECT count(*) FROM "+table).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func (e *env) event(t *testing.T, ident *store.Identity, at time.Time) {
	t.Helper()
	ev := store.NewEvent{Audience: store.AudiencePlayer, Event: store.EventSignIn, At: at}
	if ident != nil {
		id := ident.ID
		ev.IdentityID = &id
	}
	if err := e.s.InsertEvent(e.ctx, ev); err != nil {
		t.Fatal(err)
	}
}

func TestAuthEventsCleanupRunsInBatchesAndBypassesTheTrigger(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "ev@example.test")
	for i := 0; i < 5; i++ {
		e.event(t, &ident, daysAgo(200+i))
	}
	e.event(t, &ident, daysAgo(1))
	e.event(t, nil, daysAgo(89))

	// Without the retention flag the trigger refuses a delete: that is the append-only guarantee.
	_, err := e.pool.Exec(e.ctx, `DELETE FROM auth_events`)
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23001" {
		t.Fatalf("plain delete: %v, want restrict_violation", err)
	}
	if _, err := e.pool.Exec(e.ctx, `UPDATE auth_events SET ip = NULL`); err == nil {
		t.Fatal("update must always be refused")
	}

	conn, err := e.pool.Acquire(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	cl := store.AuthEventsCleanup(90)
	if cl.Name == "" {
		t.Fatal("the cleanup needs a log name")
	}
	for i, want := range []int64{2, 2, 1, 0} {
		got, err := cl.Delete(e.ctx, conn.Conn(), 2)
		if err != nil || got != want {
			t.Fatalf("batch %d: deleted %d err %v, want %d", i, got, err, want)
		}
	}
	if left := e.countRows(t, "auth_events"); left != 2 {
		t.Fatalf("%d events left, want the two inside the window", left)
	}
	// The flag is transaction-local: it did not leak onto the connection.
	var setting string
	if err := conn.QueryRow(e.ctx, `SELECT coalesce(current_setting('rotra.auth_events_retention', true), '')`).Scan(&setting); err != nil || setting == "on" {
		t.Fatalf("flag leaked: %q %v", setting, err)
	}
	if _, err := conn.Exec(e.ctx, `DELETE FROM auth_events`); err == nil {
		t.Fatal("deletes outside the cleanup must still be refused on the same connection")
	}
}

type execOnly struct{}

func (execOnly) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}

func TestAuthEventsCleanupNeedsATransactionCapableConnection(t *testing.T) {
	if _, err := store.AuthEventsCleanup(90).Delete(context.Background(), execOnly{}, 10); err == nil {
		t.Fatal("a bare Execer cannot hold the transaction-local flag; the cleanup must refuse")
	}
}

func TestAuthEventsCleanupRollsBackOnError(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "rb@example.test")
	e.event(t, &ident, daysAgo(200))
	conn, err := e.pool.Acquire(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	ctx, cancel := context.WithCancel(e.ctx)
	cancel()
	if _, err := store.AuthEventsCleanup(90).Delete(ctx, conn.Conn(), 10); err == nil {
		t.Fatal("a cancelled context must fail the batch")
	}
	if e.countRows(t, "auth_events") != 1 {
		t.Fatal("a failed batch deletes nothing")
	}
	// pgx closes a connection whose context was cancelled mid-call; a fresh one finds the row still there.
	conn.Release()
	conn, err = e.pool.Acquire(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	if got, err := store.AuthEventsCleanup(90).Delete(e.ctx, conn.Conn(), 10); err != nil || got != 1 {
		t.Fatalf("after the failure: %d %v", got, err)
	}
}

// sessionsFixture builds one session per interesting case on a player identity.
type sessionsFixture struct {
	oldRevoked, oldExpired, recentRevoked, active, referencedRecent, referencedOld uuid.UUID
}

func (e *env) endedSession(t *testing.T, ident store.Identity, d byte, expires time.Time, revokedAt *time.Time) uuid.UUID {
	t.Helper()
	s, err := e.s.InsertSession(e.ctx, store.NewSession{IdentityID: ident.ID, Audience: store.AudiencePlayer, DeviceLabel: "Phone",
		RefreshDigest: dg(d), Now: daysAgo(400), ExpiresAt: expires})
	if err != nil {
		t.Fatal(err)
	}
	if revokedAt != nil {
		if _, err := e.s.RevokeSession(e.ctx, s.ID, store.ReasonSignOut, *revokedAt); err != nil {
			t.Fatal(err)
		}
	}
	return s.ID
}

func (e *env) sessionExists(t *testing.T, id uuid.UUID) bool {
	t.Helper()
	var n int
	if err := e.pool.QueryRow(e.ctx, `SELECT count(*) FROM auth_sessions WHERE id = $1`, id).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n == 1
}

func (e *env) eventForSession(t *testing.T, ident store.Identity, session uuid.UUID, at time.Time) {
	t.Helper()
	e.exec(t, `INSERT INTO auth_events (identity_id, session_id, audience, event, occurred_at) VALUES ($1, $2, 'player', 'session_revoked', $3)`,
		ident.ID, session, at)
}

func TestAuthSessionsCleanupDeletesEndedSessionsAndSkipsReferencedOnes(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "ss@example.test")
	var f sessionsFixture
	f.oldRevoked = e.endedSession(t, ident, 1, daysAgo(100), ptr(daysAgo(200)))
	f.oldExpired = e.endedSession(t, ident, 2, daysAgo(150), nil)
	f.recentRevoked = e.endedSession(t, ident, 3, daysAgo(-20), ptr(daysAgo(10)))
	f.active = e.endedSession(t, ident, 4, daysAgo(-20), nil)
	f.referencedRecent = e.endedSession(t, ident, 5, daysAgo(100), ptr(daysAgo(200)))
	f.referencedOld = e.endedSession(t, ident, 6, daysAgo(100), ptr(daysAgo(200)))
	e.eventForSession(t, ident, f.referencedRecent, daysAgo(1))
	e.eventForSession(t, ident, f.referencedOld, daysAgo(199))

	// The design's RESTRICT: a plain delete of a referenced session is refused.
	if _, err := e.pool.Exec(e.ctx, `DELETE FROM auth_sessions WHERE id = $1`, f.referencedOld); err == nil {
		t.Fatal("RESTRICT must refuse deleting a session an event still references")
	}

	conn, err := e.pool.Acquire(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	sessions := store.AuthSessionsCleanup(90)
	// Sessions first (wrong order on purpose): the referenced ones are skipped, no error, the rest go.
	got, err := sessions.Delete(e.ctx, conn.Conn(), 1000)
	if err != nil || got != 2 {
		t.Fatalf("sessions before events: deleted %d err %v, want 2 and no error", got, err)
	}
	for name, id := range map[string]uuid.UUID{"recent revoked": f.recentRevoked, "active": f.active, "referenced recent": f.referencedRecent, "referenced old": f.referencedOld} {
		if !e.sessionExists(t, id) {
			t.Errorf("%s session must stay", name)
		}
	}
	for name, id := range map[string]uuid.UUID{"old revoked": f.oldRevoked, "old expired": f.oldExpired} {
		if e.sessionExists(t, id) {
			t.Errorf("%s session must be deleted", name)
		}
	}

	// Events cleanup frees the old reference; the recent event keeps its session.
	if got, err := store.AuthEventsCleanup(90).Delete(e.ctx, conn.Conn(), 1000); err != nil || got != 1 {
		t.Fatalf("events: %d %v", got, err)
	}
	if got, err := sessions.Delete(e.ctx, conn.Conn(), 1000); err != nil || got != 1 {
		t.Fatalf("sessions after events: %d %v, want exactly the formerly referenced one", got, err)
	}
	if e.sessionExists(t, f.referencedOld) || !e.sessionExists(t, f.referencedRecent) {
		t.Fatal("only the session whose events are gone may go")
	}
}

func TestHousekeepingRunnerDeletesEventsThenSessionsInOneRun(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "run@example.test")
	var ids []uuid.UUID
	for i := 0; i < 5; i++ {
		id := e.endedSession(t, ident, byte(10+i), daysAgo(100), ptr(daysAgo(200)))
		e.eventForSession(t, ident, id, daysAgo(199))
		ids = append(ids, id)
	}
	keep := e.endedSession(t, ident, 30, daysAgo(-20), nil)

	r := housekeeping.New(e.pool, slog.New(slog.NewTextHandler(io.Discard, nil)), housekeeping.Options{BatchSize: 2})
	r.Register(store.AuthEventsCleanup(90))
	r.Register(store.AuthSessionsCleanup(90))
	ran, err := r.RunOnce(e.ctx)
	if err != nil || !ran {
		t.Fatalf("run: %v %v", ran, err)
	}
	if n := e.countRows(t, "auth_events"); n != 0 {
		t.Fatalf("%d events left", n)
	}
	for _, id := range ids {
		if e.sessionExists(t, id) {
			t.Fatal("an ended session with its events gone must be deleted in the same run")
		}
	}
	if !e.sessionExists(t, keep) {
		t.Fatal("the active session must stay")
	}
	stats := r.Stats()
	if stats["auth_events"] != 5 || stats["auth_sessions"] != 5 {
		t.Fatalf("stats: %v", stats)
	}
}
