package publicreads

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// readTx runs fn on one repeatable-read, read-only snapshot, so the pieces of one answer agree.
func readTx(ctx context.Context, pool *pgxpool.Pool, fn func(*sqlcgen.Queries) error) (err error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return fmt.Errorf("starting read transaction: %w", err)
	}
	defer func() {
		if rbErr := tx.Rollback(context.WithoutCancel(ctx)); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) && err == nil {
			err = fmt.Errorf("ending read transaction: %w", rbErr)
		}
	}()
	return fn(sqlcgen.New(tx))
}

// failRead logs an unexpected failure (never the request's data) and answers the unexpected-error body.
func failRead(w http.ResponseWriter, r *http.Request, log *slog.Logger, msg string, err error) {
	log.LogAttrs(r.Context(), slog.LevelError, msg,
		slog.String("request_id", httpapi.RequestIDFrom(r.Context())), slog.String("error", err.Error()))
	httpapi.WriteInternal(w)
}

// parseUUID reads a path segment as a player ID the way the TypeScript services do: the 8-4-4-4-12
// hex form, either case, and nothing else. Anything else can name no player.
func parseUUID(s string) (id [16]byte, ok bool) {
	if len(s) != 36 {
		return id, false
	}
	n := 0
	for i := 0; i < len(s); i++ {
		c := s[i]
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return id, false
			}
			continue
		}
		var v byte
		switch {
		case c >= '0' && c <= '9':
			v = c - '0'
		case c >= 'a' && c <= 'f':
			v = c - 'a' + 10
		case c >= 'A' && c <= 'F':
			v = c - 'A' + 10
		default:
			return id, false
		}
		if n%2 == 0 {
			id[n/2] = v << 4
		} else {
			id[n/2] |= v
		}
		n++
	}
	return id, true
}
