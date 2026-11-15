// Package db is the Postgres connection pool (pgx) and the sqlc-generated queries.
package db

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// DefaultMaxConns is the pool size when Options.MaxConns is not set.
const DefaultMaxConns = 10

// Options tunes the pool. Zero values mean defaults.
type Options struct {
	MaxConns int32
}

// Pool wraps the pgx pool. It satisfies httpapi.Pinger.
type Pool struct{ pool *pgxpool.Pool }

// Open builds the pool. It does not connect: the process starts with the database down and /readyz
// reports it, so Railway keeps the old copy until the new one is ready.
func Open(ctx context.Context, databaseURL string, o Options) (*Pool, error) {
	u, err := url.Parse(databaseURL)
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") || u.Hostname() == "" {
		return nil, fmt.Errorf("DATABASE_URL must be a postgres:// URL with a host")
	}
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parsing DATABASE_URL: %w", err)
	}
	cfg.MaxConns = DefaultMaxConns
	if o.MaxConns > 0 {
		cfg.MaxConns = o.MaxConns
	}
	cfg.HealthCheckPeriod = time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("creating pool: %w", err)
	}
	return &Pool{pool: pool}, nil
}

// Ping runs a real round trip on a pooled connection.
func (p *Pool) Ping(ctx context.Context) error { return p.pool.Ping(ctx) }

// Close waits for borrowed connections to come back, then closes the pool.
func (p *Pool) Close() { p.pool.Close() }

// Queries returns the generated query set bound to the pool.
func (p *Pool) Queries() *sqlcgen.Queries { return sqlcgen.New(p.pool) }

// Raw exposes the pgx pool for code that needs more than the generated queries (housekeeping).
func (p *Pool) Raw() *pgxpool.Pool { return p.pool }
