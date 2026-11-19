// Package writes is what every ported POST/PATCH/DELETE Route Handler shares: the service error and the way it is
// answered (handler.ts), the JSON body reader (request.ts), the optimistic revision check (authorize.ts) and the
// one transaction a write runs in. The Admin and Player write packages build on it.
//
// A write package registers its routes on the shared signedin.Router with the pass check of its app
// (Authenticator.Require(aud, session.ModeWrite)) and wraps each body in Handle:
//
//	rt.Handle("POST /api/things", store.AudienceAdmin, auth.Require(store.AudienceAdmin, session.ModeWrite)(writes.Handle(log, create)))
package writes

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// Error is a ServiceError of the TypeScript services: a catalog code and optional field messages.
type Error struct {
	Code   httpapi.ErrorCode
	Fields map[string]string
}

func (e *Error) Error() string { return string(e.Code) }

// Fail is `new ServiceError(code, fields)`. Fields may be nil.
func Fail(code httpapi.ErrorCode, fields map[string]string) *Error {
	return &Error{Code: code, Fields: fields}
}

// Result is a service's result: a status (200 when zero) and a body shaped from allowlisted fields.
type Result struct {
	Status int
	Body   any
}

// Command is the body of one write route. It runs after the pass check, with the principal in the context.
type Command func(r *http.Request, p session.Principal) (Result, error)

// Handle is the tail of handleAccountRequest: it runs the command, writes its result as a private response, and
// answers a service error with its status and the envelope. Anything else is the unexpected-error body, with the
// details in the log only. The pass check is the caller's (Require with ModeWrite).
func Handle(log *slog.Logger, cmd Command) http.Handler {
	if log == nil {
		log = slog.New(slog.DiscardHandler)
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, ok := session.PrincipalFrom(r.Context())
		if !ok {
			httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
			return
		}
		res, err := cmd(r, p)
		if err != nil {
			Write(w, r, log, err)
			return
		}
		status := res.Status
		if status == 0 {
			status = http.StatusOK
		}
		httpapi.WriteJSON(w, status, res.Body, httpapi.Private)
	})
}

// Write answers an error the way handler.ts does.
func Write(w http.ResponseWriter, r *http.Request, log *slog.Logger, err error) {
	var se *Error
	if errors.As(err, &se) {
		httpapi.WriteError(w, se.Code, se.Fields)
		return
	}
	log.LogAttrs(r.Context(), slog.LevelError, "write failed",
		slog.String("request_id", httpapi.RequestIDFrom(r.Context())), slog.String("error", err.Error()))
	httpapi.WriteInternal(w)
}

// txTimeout bounds a write whose client left: the transaction still finishes, as a Route Handler's does when the
// browser closes the connection, but it cannot hold its locks for ever.
const txTimeout = 30 * time.Second

// InTx runs fn in one transaction at the default (read committed) isolation, as Prisma's $transaction does. It
// commits when fn returns nil and rolls back otherwise. A client that leaves does not cancel it: fn gets the
// context to run its queries with, which is not the request's.
func InTx(ctx context.Context, pool *pgxpool.Pool, fn func(ctx context.Context, q *sqlcgen.Queries) error) (err error) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), txTimeout)
	defer cancel()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("starting write transaction: %w", err)
	}
	defer func() {
		if rbErr := tx.Rollback(ctx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) && err == nil {
			err = fmt.Errorf("ending write transaction: %w", rbErr)
		}
	}()
	if err := fn(ctx, sqlcgen.New(tx)); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing write transaction: %w", err)
	}
	return nil
}

// IsUniqueViolation is Prisma's P2002: a unique index or primary key refused a row.
func IsUniqueViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505"
}
