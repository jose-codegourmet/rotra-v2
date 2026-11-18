package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// Queries is the set of operations. It is bound either to the pool (each call is its own statement) or to
// one transaction (Store.InTx), and means the same in both, typed errors included.
type Queries struct{ q *sqlcgen.Queries }

// Store is the pool-bound Queries plus transactions.
type Store struct {
	*Queries
	pool *pgxpool.Pool
}

// New builds a Store on pool.
func New(pool *pgxpool.Pool) *Store {
	return &Store{Queries: &Queries{q: sqlcgen.New(pool)}, pool: pool}
}

// InTx runs fn in one transaction: committed when fn returns nil, rolled back when it returns an error or
// panics (the panic then continues). The Queries fn receives is bound to that transaction. Do not use the
// Store itself inside fn: it would run outside the transaction.
func (s *Store) InTx(ctx context.Context, fn func(q *Queries) error) error {
	return s.InTxWith(ctx, func(_ pgx.Tx, q *Queries) error { return fn(q) })
}

// InTxWith is InTx for callers that also need the transaction itself, so another domain's queries (the
// player tables, say) run in the same transaction as the auth tables and commit or roll back with them.
func (s *Store) InTxWith(ctx context.Context, fn func(tx pgx.Tx, q *Queries) error) (err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	// A cancelled ctx must still roll back, or the connection goes back to the pool mid-transaction.
	rollback := func() {
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		_ = tx.Rollback(rctx)
	}
	defer func() {
		if p := recover(); p != nil {
			rollback()
			panic(p)
		}
	}()
	if err := fn(tx, &Queries{q: sqlcgen.New(tx)}); err != nil {
		rollback()
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		rollback()
		return fmt.Errorf("committing transaction: %w", err)
	}
	return nil
}

// NewID returns a fresh UUIDv7 (Postgres 17 has no uuidv7(), so ids are generated here).
func NewID() uuid.UUID {
	id, err := uuid.NewV7()
	if err != nil {
		// NewV7 only fails when the system random source does; nothing sensible can continue.
		panic(fmt.Sprintf("auth store: generating a UUIDv7: %v", err))
	}
	return id
}

func idOrNew(id uuid.UUID) uuid.UUID {
	if id == uuid.Nil {
		return NewID()
	}
	return id
}

// mapErr turns the database errors callers branch on into the package's typed ones.
func mapErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "auth_identities_audience_login_key_key" {
		return ErrLoginKeyTaken
	}
	return err
}

// wrap adds the operation to an unexpected error while keeping the typed ones intact.
func wrap(op string, err error) error {
	if err = mapErr(err); err == nil || errors.Is(err, ErrNotFound) || errors.Is(err, ErrLoginKeyTaken) {
		return err
	}
	return fmt.Errorf("auth store: %s: %w", op, err)
}

// rowsOrNotFound maps "no row updated" to ErrNotFound.
func rowsOrNotFound(op string, n int64, err error) error {
	if err != nil {
		return wrap(op, err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func pgUUID(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }

func pgUUIDp(u *uuid.UUID) pgtype.UUID {
	if u == nil {
		return pgtype.UUID{}
	}
	return pgUUID(*u)
}

func fromPgUUID(p pgtype.UUID) uuid.UUID { return uuid.UUID(p.Bytes) }

func fromPgUUIDp(p pgtype.UUID) *uuid.UUID {
	if !p.Valid {
		return nil
	}
	u := uuid.UUID(p.Bytes)
	return &u
}

func pgTime(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

func pgTimep(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{}
	}
	return pgTime(*t)
}

func fromPgTime(p pgtype.Timestamptz) time.Time { return p.Time.UTC() }

func fromPgTimep(p pgtype.Timestamptz) *time.Time {
	if !p.Valid {
		return nil
	}
	t := p.Time.UTC()
	return &t
}

func uuidsFrom(ps []pgtype.UUID) []uuid.UUID {
	out := make([]uuid.UUID, len(ps))
	for i, p := range ps {
		out[i] = fromPgUUID(p)
	}
	return out
}
