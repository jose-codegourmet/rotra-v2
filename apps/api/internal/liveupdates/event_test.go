package liveupdates_test

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

func TestAppendAddsTheEventAndMovesTheSessionVersion(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := context.Background()
	ids := h.commit(
		liveupdates.Event{ClubID: uid(clubSmash), SessionID: uid(sessionPrep), PlayerIDs: []pgtype.UUID{uid(playerAnn)}, Kind: "queue"},
		sessionEvent(sessionPrep, "roster"),
	)
	if ids[1] <= ids[0] {
		t.Fatalf("ids %v are not increasing", ids)
	}
	var kind, club, session string
	var players []pgtype.UUID
	if err := h.pool.QueryRow(ctx, `SELECT kind, club_id::text, session_id::text, player_ids FROM live_update_events WHERE id = $1`, ids[0]).Scan(&kind, &club, &session, &players); err != nil {
		t.Fatal(err)
	}
	if kind != "queue" || club != clubSmash || session != sessionPrep || len(players) != 1 || players[0] != uid(playerAnn) {
		t.Fatalf("row = %s %s %s %v", kind, club, session, players)
	}
	// The session's snapshot version is the newest event's id; a club-wide event leaves every session alone.
	if got := h.scalar(`SELECT latest_event_id FROM queue_sessions WHERE id = $1`, sessionPrep); got != itoa(ids[1]) {
		t.Fatalf("latest_event_id = %s, want %d", got, ids[1])
	}
	club2 := h.commit(liveupdates.Event{ClubID: uid(clubSmash), Kind: "club"})
	if got := h.scalar(`SELECT latest_event_id FROM queue_sessions WHERE id = $1`, sessionPrep); got != itoa(ids[1]) {
		t.Fatalf("a club-wide event moved a session version to %s", got)
	}
	if got := h.scalar(`SELECT count(*) FROM live_update_events WHERE id = $1 AND session_id IS NULL AND player_ids = '{}'`, club2[0]); got != "1" {
		t.Fatal("a club-wide event must have no session and an empty player list")
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

func TestEventStoresTheWritingTransactionIdByDefault(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := context.Background()
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var xid string
	if err := tx.QueryRow(ctx, `SELECT pg_current_xact_id()::text`).Scan(&xid); err != nil {
		t.Fatal(err)
	}
	id, err := liveupdates.Append(ctx, tx, sessionEvent(sessionPrep, "session"))
	if err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if got := h.scalar(`SELECT xact_id::text FROM live_update_events WHERE id = $1`, id); got != xid {
		t.Fatalf("xact_id = %s, want the writer's %s", got, xid)
	}
}

func TestAppendRefusesAnEventWithNoKindOrClub(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := context.Background()
	tx, _ := h.pool.Begin(ctx)
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := liveupdates.Append(ctx, tx, liveupdates.Event{ClubID: uid(clubSmash)}); err == nil {
		t.Error("an event with no kind was accepted")
	}
	if _, err := liveupdates.Append(ctx, tx, liveupdates.Event{Kind: "club"}); err == nil {
		t.Error("an event with no club was accepted")
	}
}

func TestEventIsWrittenIffTheWriteCommits(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := liveupdates.WithScope(context.Background(), liveupdates.KindRoster)
	count := func() string { return h.scalar(`SELECT count(*) FROM live_update_events`) }

	err := writes.InTx(ctx, h.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		liveupdates.Note(ctx, uid(clubSmash), uid(sessionPrep))
		return errors.New("the write failed")
	})
	if err == nil || count() != "0" {
		t.Fatalf("a rolled back write left %s events (err %v)", count(), err)
	}
	if got := h.scalar(`SELECT latest_event_id IS NULL FROM queue_sessions WHERE id = $1`, sessionPrep); got != "true" {
		t.Fatal("a rolled back write moved the session version")
	}

	if err := writes.InTx(ctx, h.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		liveupdates.Note(ctx, uid(clubSmash), uid(sessionPrep))
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if count() != "1" {
		t.Fatalf("a committed write left %s events, want 1", count())
	}
}

func TestAWriteWhoseEventCannotBeAddedFailsAndForgetsWhatWasNoted(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := liveupdates.WithScope(context.Background(), liveupdates.KindRoster)
	h.env.Exec(t, `ALTER TABLE live_update_events RENAME TO zz_away`)
	err := writes.InTx(ctx, h.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		liveupdates.Note(ctx, uid(clubSmash), uid(sessionPrep))
		return nil
	})
	if err == nil {
		t.Fatal("a write whose event could not be added must fail")
	}
	if liveupdates.Pending(ctx) != 0 {
		t.Fatal("noted events outlived the failed write")
	}
}

func TestNoteMergesPlayersAndSortsSessions(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := liveupdates.WithScope(context.Background(), liveupdates.KindQueue)
	if err := writes.InTx(ctx, h.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		liveupdates.Note(ctx, uid(clubSmash), uid(sessionLive))
		liveupdates.Note(ctx, uid(clubSmash), uid(sessionPrep), uid(playerAnn))
		liveupdates.Note(ctx, uid(clubSmash), uid(sessionPrep), uid(playerBen), uid(playerAnn), pgtype.UUID{})
		liveupdates.NoteKind(ctx, "club", uid(clubSmash), pgtype.UUID{})
		liveupdates.Note(ctx, pgtype.UUID{}, uid(sessionPrep)) // no club: nothing to note
		if n := liveupdates.Pending(ctx); n != 3 {
			t.Errorf("pending = %d, want 3 (the two sessions merged by key, and the club)", n)
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if got := h.scalar(`SELECT count(*) FROM live_update_events`); got != "3" {
		t.Fatalf("events = %s, want 3", got)
	}
	// One event per session, the players of every note on it, in session order after the club-wide one.
	rows, err := h.pool.Query(context.Background(), `SELECT session_id::text, kind, player_ids FROM live_update_events ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var order []string
	for rows.Next() {
		var s *string
		var k string
		var p []pgtype.UUID
		if err := rows.Scan(&s, &k, &p); err != nil {
			t.Fatal(err)
		}
		switch {
		case s == nil:
			order = append(order, "club:"+k)
		case *s == sessionPrep:
			if len(p) != 2 {
				t.Errorf("the merged event has %d players, want 2 (Ann once, Ben)", len(p))
			}
			order = append(order, "prep:"+k)
		default:
			order = append(order, "live:"+k)
		}
	}
	if want := []string{"club:club", "prep:queue", "live:queue"}; len(order) != 3 || order[0] != want[0] || order[1] != want[1] || order[2] != want[2] {
		t.Fatalf("events in id order = %v, want %v (club-wide first, then sessions by id)", order, want)
	}
}

func TestNoteWithNoScopeDoesNothing(t *testing.T) {
	ctx := context.Background()
	liveupdates.Note(ctx, uid(clubSmash), uid(sessionPrep))
	liveupdates.Discard(ctx)
	if liveupdates.Pending(ctx) != 0 {
		t.Fatal("a note with no scope was kept")
	}
	if err := liveupdates.Flush(ctx, nil); err != nil {
		t.Fatal(err)
	}
	// EnsureScope gives work outside a routed write a scope, and keeps an existing one.
	scoped := liveupdates.EnsureScope(ctx, liveupdates.KindFinalization)
	liveupdates.Note(scoped, uid(clubSmash), uid(sessionPrep))
	if liveupdates.Pending(scoped) != 1 {
		t.Fatal("EnsureScope gave no scope")
	}
	if again := liveupdates.EnsureScope(scoped, "other"); liveupdates.Pending(again) != 1 {
		t.Fatal("EnsureScope replaced the scope it was given")
	}
}

// B-49: two writes to one session get event ids in commit order, and a write to another session does not wait for them.
func TestTwoWritesToOneSessionCommitInIdOrderAndOtherSessionsDoNotWait(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := context.Background()

	a, err := h.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = a.Rollback(ctx) }()
	idA, err := liveupdates.Append(ctx, a, sessionEvent(sessionPrep, "roster"))
	if err != nil {
		t.Fatal(err)
	}

	// A write to the same session waits for A's commit; a write to another session goes straight through.
	var idB int64
	bDone := make(chan error, 1)
	go func() {
		tx, err := h.pool.Begin(ctx)
		if err != nil {
			bDone <- err
			return
		}
		id, err := liveupdates.Append(ctx, tx, sessionEvent(sessionPrep, "courts"))
		if err == nil {
			idB = id
			err = tx.Commit(ctx)
		}
		bDone <- err
	}()
	select {
	case err := <-bDone:
		t.Fatalf("a write to the same session did not wait for the first (err %v)", err)
	case <-time.After(300 * time.Millisecond):
	}
	idC := h.commit(sessionEvent(sessionLive, "queue"))[0] // another session: not blocked
	if idC == 0 {
		t.Fatal("no id for the other session")
	}
	if err := a.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if err := <-bDone; err != nil {
		t.Fatal(err)
	}
	if idB <= idA {
		t.Fatalf("the second write got id %d, not after the first's %d", idB, idA)
	}
	if got := h.scalar(`SELECT latest_event_id FROM queue_sessions WHERE id = $1`, sessionPrep); got != itoa(idB) {
		t.Fatalf("the session version is %s, want the newest id %d", got, idB)
	}
}

func TestNotifyArrivesAfterCommitOnly(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	ctx := context.Background()
	listener, err := pgx.Connect(ctx, h.pool.Config().ConnString())
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = listener.Close(ctx) }()
	if _, err := listener.Exec(ctx, "LISTEN "+liveupdates.Channel); err != nil {
		t.Fatal(err)
	}
	tx, _ := h.pool.Begin(ctx)
	if _, err := liveupdates.Append(ctx, tx, sessionEvent(sessionPrep, "roster")); err != nil {
		t.Fatal(err)
	}
	wait := func(d time.Duration) bool {
		c, cancel := context.WithTimeout(ctx, d)
		defer cancel()
		_, err := listener.WaitForNotification(c)
		return err == nil
	}
	if wait(300 * time.Millisecond) {
		t.Fatal("the nudge arrived before the commit")
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if !wait(3 * time.Second) {
		t.Fatal("no nudge after the commit")
	}
	// And a rollback sends none.
	tx, _ = h.pool.Begin(ctx)
	if _, err := liveupdates.Append(ctx, tx, sessionEvent(sessionPrep, "roster")); err != nil {
		t.Fatal(err)
	}
	_ = tx.Rollback(ctx)
	if wait(300 * time.Millisecond) {
		t.Fatal("a rolled back write sent a nudge")
	}
}

func TestMigrationNeedsPostgres13OrLater(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	var v int
	if err := h.pool.QueryRow(context.Background(), `SELECT current_setting('server_version_num')::int`).Scan(&v); err != nil {
		t.Fatal(err)
	}
	if v < 130000 {
		t.Fatalf("server_version_num %d: xid8 and pg_current_xact_id() need Postgres 13", v)
	}
	if !testpg.Available() {
		t.Skip("no postgres")
	}
}
