package signedin

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

// serviceError is a ServiceError of the TypeScript services: a catalog code and optional field messages.
type serviceError struct {
	code   httpapi.ErrorCode
	fields map[string]string
}

func (e *serviceError) Error() string { return string(e.code) }

var errNotFound = &serviceError{code: httpapi.ErrNotFound}

// write answers an error the way handler.ts does: a service error with its status, anything else as the
// unexpected-error body, with the details in the log only.
func (s *server) write(w http.ResponseWriter, r *http.Request, err error) {
	var se *serviceError
	if errors.As(err, &se) {
		httpapi.WriteError(w, se.code, se.fields)
		return
	}
	s.log.LogAttrs(r.Context(), slog.LevelError, "signed-in read failed",
		slog.String("request_id", httpapi.RequestIDFrom(r.Context())), slog.String("error", err.Error()))
	httpapi.WriteInternal(w)
}

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
