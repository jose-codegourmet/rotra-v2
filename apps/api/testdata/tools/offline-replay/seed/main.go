// Command seed loads the Queue write test data into a throwaway local database and makes the club account "smash"
// able to sign in through the Go API. Run it only through run.sh: it refuses any database that is not local and not
// named rotra_disposable*, and it never prints the password.
//
//	go run ./testdata/tools/offline-replay/seed <database url> <password>
package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	authstore "github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// The live session of Smash Club in queue.seed.sql ("Live Now") and the club's other sessions.
const liveSession = "a3000000-0000-4000-8000-000000000003"

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: seed <database url> <password>")
		os.Exit(2)
	}
	if err := run(os.Args[1], os.Args[2]); err != nil {
		fmt.Fprintln(os.Stderr, "seed:", err)
		os.Exit(1)
	}
}

func checkLocal(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	switch u.Hostname() {
	case "127.0.0.1", "localhost", "::1":
	default:
		return fmt.Errorf("refusing: host %q is not local", u.Hostname())
	}
	if !strings.HasPrefix(strings.TrimPrefix(u.Path, "/"), "rotra_disposable") {
		return fmt.Errorf("refusing: database %q must start with rotra_disposable", strings.TrimPrefix(u.Path, "/"))
	}
	return nil
}

func run(dsn, pw string) error {
	if err := checkLocal(dsn); err != nil {
		return err
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return err
	}
	defer pool.Close()
	sql, err := os.ReadFile(filepath.Join("internal", "queuewrites", "testdata", "queue.seed.sql"))
	if err != nil {
		return err
	}
	// No arguments: pgx uses the simple protocol, which allows many statements per call.
	if _, err := pool.Exec(ctx, string(sql)); err != nil {
		return fmt.Errorf("load queue.seed.sql: %w", err)
	}
	hash, err := password.DefaultParams().Hash(pw)
	if err != nil {
		return err
	}
	st := authstore.New(pool)
	rows, err := pool.Query(ctx, `SELECT auth_subject, username FROM club_accounts WHERE auth_subject IS NOT NULL ORDER BY club_id`)
	if err != nil {
		return err
	}
	type acc struct {
		subject uuid.UUID
		name    string
	}
	var accs []acc
	for rows.Next() {
		var a acc
		if err := rows.Scan(&a.subject, &a.name); err != nil {
			return err
		}
		accs = append(accs, a)
	}
	rows.Close()
	if _, err := pool.Exec(ctx, `UPDATE club_accounts SET auth_provider = 'rotra'`); err != nil {
		return err
	}
	for _, a := range accs {
		// Run again on the same database: the identity and its sign-in history (append-only) stay as they are.
		var have bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM auth_identities WHERE id = $1)`, a.subject).Scan(&have); err != nil {
			return err
		}
		if have {
			continue
		}
		if _, err := st.InsertIdentity(ctx, authstore.NewIdentity{
			ID: a.subject, Audience: authstore.AudienceClub, LoginKey: a.name, PasswordHash: hash,
			PasswordScheme: authstore.SchemeArgon2id, Now: time.Now(),
		}); err != nil {
			return fmt.Errorf("insert identity %s: %w", a.name, err)
		}
	}
	// The seed's times are fixed instants in the past. Move the live session around now, and every other session of the club
	// two years ahead so none clashes with it (the club runs one session at a time).
	for _, q := range []string{
		`UPDATE queue_sessions SET scheduled_start_at = scheduled_start_at + interval '2 years',
		   scheduled_end_at = scheduled_end_at + interval '2 years'
		 WHERE club_id = (SELECT club_id FROM queue_sessions WHERE id = '` + liveSession + `')
		   AND id <> '` + liveSession + `' AND state IN ('prepared', 'active')`,
		`UPDATE queue_sessions SET scheduled_start_at = now() - interval '1 hour', started_at = now() - interval '1 hour',
		   scheduled_end_at = now() + interval '5 hours' WHERE id = '` + liveSession + `'`,
		// A fee for the session: a paid tick with no fee set is refused by design (#245), so the payment mark needs one.
		`INSERT INTO session_cost_estimates (session_id, club_id, payment_mode, custom_fee_per_head_minor, updated_at)
		 SELECT id, club_id, 'custom', 20000, now() FROM queue_sessions WHERE id = '` + liveSession + `'
		 ON CONFLICT (session_id) DO NOTHING`,
	} {
		if _, err := pool.Exec(ctx, q); err != nil {
			return fmt.Errorf("move sessions: %w", err)
		}
	}
	fmt.Println("seeded: club account smash can sign in; live session " + liveSession)
	return nil
}
