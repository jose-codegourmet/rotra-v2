// Command authimport copies the Supabase Auth accounts into the Go sign-in's auth_identities, with their
// existing bcrypt hashes (no password reset; the first sign-in rehashes to argon2id), and points each
// account row at its new identity (auth_provider 'rotra', auth_subject = the identity id).
//
//	SUPABASE_DATABASE_URL=... DATABASE_URL=... go run ./cmd/authimport --dry-run   # counts, writes nothing
//	SUPABASE_DATABASE_URL=... DATABASE_URL=... go run ./cmd/authimport             # import
//	DATABASE_URL=...                           go run ./cmd/authimport --verify    # accounts vs identities
//
// SUPABASE_DATABASE_URL is read only (auth.users) and DATABASE_URL is the app database (the account tables
// and auth_identities); the tool refuses to run when they are the same database, so the source is a copy of
// auth.users (a restore, or a replica) and the target is the database being moved. It never prints a hash,
// an email, a username or any other personal data, only counts and ids. See
// docs/database_design/product/sign-in.md (Moving accounts from Supabase).
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	if err := run(ctx, os.Args[1:], os.Getenv, os.Stdout, os.Stderr, time.Now); err != nil {
		fmt.Fprintln(os.Stderr, "authimport:", err)
		os.Exit(1)
	}
}

// run is main with its inputs passed in. It prints the report to stdout, logs to stderr, and returns an
// error when the run must exit non-zero (bad setup, an account that failed, a verify with gaps).
func run(ctx context.Context, args []string, getenv func(string) string, stdout, stderr io.Writer, now func() time.Time) error {
	fs := flag.NewFlagSet("authimport", flag.ContinueOnError)
	fs.SetOutput(stderr)
	dryRun := fs.Bool("dry-run", false, "run every step and roll back: print what would be imported, write nothing")
	verify := fs.Bool("verify", false, "compare accounts with identities and print any account without one (needs DATABASE_URL only)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() > 0 {
		return errors.New("unexpected arguments: the tool takes flags only")
	}
	if *verify && *dryRun {
		return errors.New("--verify and --dry-run cannot be combined")
	}
	if now == nil {
		now = time.Now
	}
	log := slog.New(slog.NewTextHandler(stderr, nil))

	targetDSN := getenv("DATABASE_URL")
	if targetDSN == "" {
		return errors.New("DATABASE_URL is not set (the app database)")
	}
	im := &Importer{Now: now, Log: log}

	if *verify {
		target, err := openPool(ctx, targetDSN, true)
		if err != nil {
			return fmt.Errorf("DATABASE_URL: %w", err)
		}
		defer target.Close()
		im.Target = target
		rep, err := im.Verify(ctx)
		if err != nil {
			return err
		}
		if err := rep.Print(stdout); err != nil {
			return err
		}
		if n := rep.Gaps(); n > 0 {
			return fmt.Errorf("%d account(s) have no identity", n)
		}
		return nil
	}

	sourceDSN := getenv("SUPABASE_DATABASE_URL")
	if sourceDSN == "" {
		return errors.New("SUPABASE_DATABASE_URL is not set (a read-only copy of Supabase's auth.users)")
	}
	if sameDSN(sourceDSN, targetDSN) {
		return errors.New("SUPABASE_DATABASE_URL and DATABASE_URL name the same database; the source must be a different database")
	}
	source, err := openPool(ctx, sourceDSN, true)
	if err != nil {
		return fmt.Errorf("SUPABASE_DATABASE_URL: %w", err)
	}
	defer source.Close()
	target, err := openPool(ctx, targetDSN, false)
	if err != nil {
		return fmt.Errorf("DATABASE_URL: %w", err)
	}
	defer target.Close()
	switch same, checked := sameDatabase(ctx, source, target); {
	case same:
		return errors.New("SUPABASE_DATABASE_URL and DATABASE_URL reach the same database; the source must be a different database")
	case !checked:
		log.Warn("could not confirm that the source and the target are different databases (pg_control_system is not readable); only the connection strings were compared")
	}
	im.Source, im.Target = source, target

	rep, err := im.Import(ctx, *dryRun)
	if err != nil {
		return err
	}
	if err := rep.Print(stdout); err != nil {
		return err
	}
	if n := rep.Failed(); n > 0 {
		return fmt.Errorf("%d account(s) failed, see the report", n)
	}
	return nil
}

// openPool opens a small pool and checks the connection. readOnly asks the server for read-only
// transactions on every connection (on top of the read-only transactions the tool itself opens), so the
// Supabase side cannot be written even by a bug. Errors never carry the connection string.
func openPool(ctx context.Context, dsn string, readOnly bool) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, errors.New("not a valid Postgres connection string")
	}
	cfg.MaxConns = 4
	if readOnly {
		cfg.ConnConfig.RuntimeParams["default_transaction_read_only"] = "on"
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, errors.New("cannot open a connection pool")
	}
	pctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := pool.Ping(pctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("cannot connect: %w", err)
	}
	return pool, nil
}

// sameDSN reports whether two connection strings name the same host, port and database.
func sameDSN(a, b string) bool {
	ca, err := pgconn.ParseConfig(a)
	if err != nil {
		return false
	}
	cb, err := pgconn.ParseConfig(b)
	if err != nil {
		return false
	}
	return strings.EqualFold(ca.Host, cb.Host) && ca.Port == cb.Port && ca.Database == cb.Database
}

// sameDatabase asks both servers which database they are: its name and the cluster's system identifier.
// checked is false when either server refuses to say (pg_control_system needs a privilege on some hosts).
func sameDatabase(ctx context.Context, a, b *pgxpool.Pool) (same, checked bool) {
	const q = `SELECT current_database() || '/' || (SELECT system_identifier::text FROM pg_control_system())`
	var ia, ib string
	if err := a.QueryRow(ctx, q).Scan(&ia); err != nil {
		return false, false
	}
	if err := b.QueryRow(ctx, q).Scan(&ib); err != nil {
		return false, false
	}
	return ia == ib, true
}
