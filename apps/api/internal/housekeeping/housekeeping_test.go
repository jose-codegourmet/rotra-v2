package housekeeping_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/housekeeping"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

func logger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

func newPool(t *testing.T, dsn string) *pgxpool.Pool {
	t.Helper()
	p, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(p.Close)
	return p
}

// seeded returns a database with table events(id bigint identity, created_at) holding `old` rows from
// 100 days ago and `fresh` rows from now.
func seeded(t *testing.T, old, fresh int) *pgxpool.Pool {
	t.Helper()
	p := newPool(t, testpg.NewDatabase(t))
	ctx := context.Background()
	for _, q := range []string{
		`CREATE TABLE events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, created_at timestamptz NOT NULL)`,
		`INSERT INTO events (created_at) SELECT now() - interval '100 days' FROM generate_series(1, ` + itoa(old) + `)`,
		`INSERT INTO events (created_at) SELECT now() FROM generate_series(1, ` + itoa(fresh) + `)`,
	} {
		if _, err := p.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	return p
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for ; n > 0; n /= 10 {
		s = string(rune('0'+n%10)) + s
	}
	return s
}

func count(t *testing.T, p *pgxpool.Pool) int {
	t.Helper()
	var n int
	if err := p.QueryRow(context.Background(), `SELECT count(*) FROM events`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestManyRowsDeleteInBatches(t *testing.T) {
	p := seeded(t, 2500, 50)
	r := housekeeping.New(p, logger(), housekeeping.Options{BatchSize: 1000})
	r.Register(housekeeping.OlderThanDays("events", "events", "id", "created_at", 90))

	ran, err := r.RunOnce(context.Background())
	if err != nil || !ran {
		t.Fatalf("ran=%v err=%v", ran, err)
	}
	if got := count(t, p); got != 50 {
		t.Fatalf("only the fresh rows must remain, got %d", got)
	}
	if got := r.Stats()["events"]; got != 2500 {
		t.Fatalf("rows deleted counter = %d, want 2500", got)
	}
}

func TestBatchesNeverExceedBatchSize(t *testing.T) {
	p := seeded(t, 2500, 0)
	r := housekeeping.New(p, logger(), housekeeping.Options{BatchSize: 1000})
	var sizes []int64
	inner := housekeeping.OlderThanDays("events", "events", "id", "created_at", 90)
	r.Register(housekeeping.Cleanup{Name: "events", Delete: func(ctx context.Context, x housekeeping.Execer, limit int) (int64, error) {
		n, err := inner.Delete(ctx, x, limit)
		sizes = append(sizes, n)
		return n, err
	}})
	if _, err := r.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	want := []int64{1000, 1000, 500}
	if len(sizes) != len(want) {
		t.Fatalf("batches = %v, want %v", sizes, want)
	}
	for i := range want {
		if sizes[i] != want[i] {
			t.Fatalf("batches = %v, want %v", sizes, want)
		}
	}
}

func TestOnlyOneInstanceRunsAtATime(t *testing.T) {
	dsn := testpg.NewDatabase(t)
	a := housekeeping.New(newPool(t, dsn), logger(), housekeeping.Options{})
	b := housekeeping.New(newPool(t, dsn), logger(), housekeeping.Options{})

	entered, release := make(chan struct{}), make(chan struct{})
	a.Register(housekeeping.Cleanup{Name: "slow", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) {
		close(entered)
		<-release
		return 0, nil
	}})
	var bCalls atomic.Int32
	b.Register(housekeeping.Cleanup{Name: "slow", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) {
		bCalls.Add(1)
		return 0, nil
	}})

	done := make(chan struct{})
	go func() {
		defer close(done)
		if ran, err := a.RunOnce(context.Background()); err != nil || !ran {
			t.Errorf("a: ran=%v err=%v", ran, err)
		}
	}()
	<-entered

	ran, err := b.RunOnce(context.Background())
	if err != nil || ran || bCalls.Load() != 0 {
		t.Fatalf("b must skip while a holds the lock: ran=%v err=%v calls=%d", ran, err, bCalls.Load())
	}
	close(release)
	<-done

	ran, err = b.RunOnce(context.Background())
	if err != nil || !ran || bCalls.Load() != 1 {
		t.Fatalf("b must run once a is done: ran=%v err=%v calls=%d", ran, err, bCalls.Load())
	}
}

func TestCancelBetweenBatchesStopsCleanly(t *testing.T) {
	p := seeded(t, 3000, 0)
	r := housekeeping.New(p, logger(), housekeeping.Options{BatchSize: 1000})
	ctx, cancel := context.WithCancel(context.Background())
	inner := housekeeping.OlderThanDays("events", "events", "id", "created_at", 90)
	var calls int
	r.Register(housekeeping.Cleanup{Name: "events", Delete: func(c context.Context, x housekeeping.Execer, limit int) (int64, error) {
		calls++
		n, err := inner.Delete(c, x, limit)
		if calls == 1 {
			cancel() // shutdown arrives after the first batch
		}
		return n, err
	}})
	if _, err := r.RunOnce(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("err = %v, want context.Canceled", err)
	}
	if calls != 1 {
		t.Fatalf("no batch may start after cancel, calls=%d", calls)
	}
	if got := count(t, p); got != 2000 {
		t.Fatalf("exactly the committed first batch is gone, remaining=%d", got)
	}
	assertLockFree(t, p)
}

func TestCancelMidStatementStopsQuicklyAndReleasesLock(t *testing.T) {
	p := newPool(t, testpg.NewDatabase(t))
	r := housekeeping.New(p, logger(), housekeeping.Options{})
	r.Register(housekeeping.Cleanup{Name: "stuck", Delete: func(c context.Context, x housekeeping.Execer, _ int) (int64, error) {
		_, err := x.Exec(c, `SELECT pg_sleep(60)`)
		return 0, err
	}})
	ctx, cancel := context.WithCancel(context.Background())
	time.AfterFunc(200*time.Millisecond, cancel)
	start := time.Now()
	_, err := r.RunOnce(ctx)
	if err == nil {
		t.Fatal("expected an error from the cancelled statement")
	}
	if d := time.Since(start); d > 5*time.Second {
		t.Fatalf("cancel took %v", d)
	}
	assertLockFree(t, p)
}

func assertLockFree(t *testing.T, p *pgxpool.Pool) {
	t.Helper()
	other := housekeeping.New(p, logger(), housekeeping.Options{})
	var ran atomic.Bool
	other.Register(housekeeping.Cleanup{Name: "probe", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) {
		ran.Store(true)
		return 0, nil
	}})
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if ok, err := other.RunOnce(context.Background()); err == nil && ok && ran.Load() {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("advisory lock was not released")
}

func TestFailingCleanupDoesNotStopTheOthers(t *testing.T) {
	p := newPool(t, testpg.NewDatabase(t))
	r := housekeeping.New(p, logger(), housekeeping.Options{})
	var ranSecond bool
	r.Register(housekeeping.Cleanup{Name: "bad", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) {
		return 0, errors.New("boom")
	}})
	r.Register(housekeeping.Cleanup{Name: "good", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) {
		ranSecond = true
		return 0, nil
	}})
	ran, err := r.RunOnce(context.Background())
	if err != nil || !ran || !ranSecond {
		t.Fatalf("ran=%v err=%v second=%v", ran, err, ranSecond)
	}
}

func TestRunLoopRunsRepeatedlyAndStopsOnCancel(t *testing.T) {
	p := newPool(t, testpg.NewDatabase(t))
	r := housekeeping.New(p, logger(), housekeeping.Options{Interval: 30 * time.Millisecond})
	var mu sync.Mutex
	runs := 0
	r.Register(housekeeping.Cleanup{Name: "tick", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) {
		mu.Lock()
		runs++
		mu.Unlock()
		return 0, nil
	}})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { r.Run(ctx); close(done) }()
	deadline := time.Now().Add(5 * time.Second)
	for {
		mu.Lock()
		n := runs
		mu.Unlock()
		if n >= 3 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("loop ran only %d times", n)
		}
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after cancel")
	}
}

func TestRunWithNoCleanupsDoesNothing(t *testing.T) {
	p := newPool(t, testpg.NewDatabase(t))
	r := housekeeping.New(p, logger(), housekeeping.Options{})
	if ran, err := r.RunOnce(context.Background()); err != nil || ran {
		t.Fatalf("no cleanups => nothing to do: ran=%v err=%v", ran, err)
	}
}

func TestDatabaseDownIsAnErrorNotAPanic(t *testing.T) {
	p, err := pgxpool.New(context.Background(), "postgres://u:p@127.0.0.1:1/x?sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	r := housekeeping.New(p, logger(), housekeeping.Options{})
	r.Register(housekeeping.Cleanup{Name: "x", Delete: func(context.Context, housekeeping.Execer, int) (int64, error) { return 0, nil }})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, err := r.RunOnce(ctx); err == nil {
		t.Fatal("expected an error")
	}
}
