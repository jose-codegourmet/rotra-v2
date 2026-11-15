// Package housekeeping is the hourly cleanup loop inside the API process (B-34, R9): it takes a Postgres
// advisory lock so one instance tidies at a time, runs each registered cleanup in batches of about 1,000
// rows until none are left, and stops promptly when the process shuts down (B-44).
// Tracks that add a growing table register its Cleanup; no cron, no extra service (B-07).
package housekeeping

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// lockKey is the advisory lock id ("rotra" housekeeping), shared by every instance.
const lockKey int64 = 0x524f54524101

// Default values for Options.
const (
	DefaultInterval  = time.Hour
	DefaultBatchSize = 1000
)

// Execer is the part of a connection a cleanup needs.
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Cleanup removes old rows. Delete removes at most limit rows in one short statement and returns how many
// it removed; the runner calls it again until it returns fewer than limit.
type Cleanup struct {
	Name   string
	Delete func(ctx context.Context, x Execer, limit int) (int64, error)
}

// OlderThanDays deletes rows of table whose tsCol is more than days old, walking the primary key idCol
// (B-34). name is the label used in logs and counters. Identifiers come from code, never from input.
func OlderThanDays(name, table, idCol, tsCol string, days int) Cleanup {
	t := pgx.Identifier{table}.Sanitize()
	id := pgx.Identifier{idCol}.Sanitize()
	ts := pgx.Identifier{tsCol}.Sanitize()
	sql := fmt.Sprintf(`DELETE FROM %[1]s WHERE %[2]s IN (SELECT %[2]s FROM %[1]s WHERE %[3]s < now() - make_interval(days => $1) ORDER BY %[2]s LIMIT $2)`, t, id, ts)
	return Cleanup{Name: name, Delete: func(ctx context.Context, x Execer, limit int) (int64, error) {
		tag, err := x.Exec(ctx, sql, days, limit)
		return tag.RowsAffected(), err
	}}
}

// Options tunes the loop. Zero values mean the defaults.
type Options struct {
	Interval  time.Duration
	BatchSize int
}

// Runner owns the registered cleanups.
type Runner struct {
	pool     *pgxpool.Pool
	log      *slog.Logger
	opts     Options
	mu       sync.Mutex
	cleanups []Cleanup
	deleted  map[string]int64
}

// New builds a Runner on pool.
func New(pool *pgxpool.Pool, log *slog.Logger, o Options) *Runner {
	if o.Interval <= 0 {
		o.Interval = DefaultInterval
	}
	if o.BatchSize <= 0 {
		o.BatchSize = DefaultBatchSize
	}
	return &Runner{pool: pool, log: log.With(slog.String("component", "housekeeping")), opts: o, deleted: map[string]int64{}}
}

// Register adds a cleanup. Call it before Run.
func (r *Runner) Register(c Cleanup) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cleanups = append(r.cleanups, c)
}

// Stats returns the total rows deleted per cleanup since the process started.
func (r *Runner) Stats() map[string]int64 {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make(map[string]int64, len(r.deleted))
	for k, v := range r.deleted {
		out[k] = v
	}
	return out
}

// Run cleans up once at start, then every Interval, until ctx ends. It returns only after any run in
// progress has stopped and released its lock.
func (r *Runner) Run(ctx context.Context) {
	tick := time.NewTicker(r.opts.Interval)
	defer tick.Stop()
	for {
		if _, err := r.RunOnce(ctx); err != nil && ctx.Err() == nil {
			r.log.Error("housekeeping run failed", slog.String("error", err.Error()))
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

// RunOnce takes the advisory lock and runs every cleanup to completion. ran is false when there is nothing
// registered or another instance holds the lock. A failing cleanup is logged and the next one still runs.
// If ctx ends, the batch in progress is cancelled (its transaction rolls back), the lock is released and
// ctx's error is returned.
func (r *Runner) RunOnce(ctx context.Context) (ran bool, err error) {
	r.mu.Lock()
	cleanups := append([]Cleanup(nil), r.cleanups...)
	r.mu.Unlock()
	if len(cleanups) == 0 {
		return false, nil
	}

	conn, err := r.pool.Acquire(ctx)
	if err != nil {
		return false, fmt.Errorf("acquiring connection: %w", err)
	}
	defer conn.Release()

	var got bool
	if err := conn.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, lockKey).Scan(&got); err != nil {
		return false, fmt.Errorf("taking advisory lock: %w", err)
	}
	if !got {
		r.log.Debug("another instance is running housekeeping; skipping")
		return false, nil
	}
	// The lock belongs to this session: unlock even when ctx is cancelled, and if that is impossible drop
	// the connection, which releases the lock on the server.
	defer func() {
		uctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Second)
		defer cancel()
		if conn.Conn().IsClosed() {
			return
		}
		var ok bool
		if uerr := conn.QueryRow(uctx, `SELECT pg_advisory_unlock($1)`, lockKey).Scan(&ok); uerr != nil || !ok {
			_ = conn.Hijack().Close(uctx)
		}
	}()

	start := time.Now()
	for _, c := range cleanups {
		if err := ctx.Err(); err != nil {
			return true, err
		}
		n, cerr := r.runCleanup(ctx, conn.Conn(), c)
		r.log.Info("housekeeping cleanup", slog.String("cleanup", c.Name), slog.Int64("rows_deleted", n))
		if cerr != nil {
			if ctx.Err() != nil {
				return true, ctx.Err()
			}
			r.log.Error("housekeeping cleanup failed", slog.String("cleanup", c.Name), slog.String("error", cerr.Error()))
		}
	}
	r.log.Debug("housekeeping run complete", slog.Duration("took", time.Since(start)))
	return true, nil
}

func (r *Runner) runCleanup(ctx context.Context, x Execer, c Cleanup) (total int64, err error) {
	defer func() {
		r.mu.Lock()
		r.deleted[c.Name] += total
		r.mu.Unlock()
	}()
	for {
		if err := ctx.Err(); err != nil {
			return total, err
		}
		n, err := c.Delete(ctx, x, r.opts.BatchSize)
		total += n
		if err != nil {
			return total, err
		}
		if n < int64(r.opts.BatchSize) {
			return total, nil
		}
	}
}
