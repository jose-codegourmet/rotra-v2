package main

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// cli runs the command like main does: env vars and flags in, stdout and stderr captured.
func (f *fx) cli(args []string, env map[string]string) (stdout, stderr string, err error) {
	var o, e bytes.Buffer
	err = run(f.ctx, args, func(k string) string { return env[k] }, &o, &e, func() time.Time { return base })
	return o.String(), e.String(), err
}

func (f *fx) env() map[string]string {
	return map[string]string{"SUPABASE_DATABASE_URL": f.sourceDSN, "DATABASE_URL": f.targetDSN}
}

// The report holds counts and ids; no hash, email or username ever reaches stdout or stderr.
func TestRunPrintsCountsAndIDsOnly(t *testing.T) {
	f := newFx(t)
	hash := bcryptHash(t, goodPass)
	f.club(t, "secret_club_name", f.user(t, "secret_club_name@clubs.rotra.invalid", withHash(hash)))
	f.player(t, "different@example.com", f.user(t, "private.person@example.com", withHash(hash))) // mismatch: logged
	f.admin(t, f.user(t, "private.admin@rotra.club", withHash("garbage")))                        // bad hash: reported

	out, errOut, err := f.cli(nil, f.env())

	if err != nil { // skips and mismatches are reported, they do not fail the run
		t.Fatalf("run: %v\n%s", err, errOut)
	}
	for _, want := range []string{"mode=import", "club pending=1 imported=1 disabled=0 skipped=0 email_mismatch=0",
		"player pending=1 imported=1 disabled=0 skipped=0 email_mismatch=1", "admin pending=1 imported=0 disabled=0 skipped=1",
		"skipped admin bad_hash "} {
		if !strings.Contains(out, want) {
			t.Fatalf("stdout lacks %q:\n%s", want, out)
		}
	}
	for _, secret := range []string{hash, hash[:20], "$2a$", "$2b$", "secret_club_name", "private.person", "private.admin", "different@", "example.com", "rotra.invalid", "garbage"} {
		if strings.Contains(out, secret) || strings.Contains(errOut, secret) {
			t.Fatalf("output leaks %q:\nstdout: %s\nstderr: %s", secret, out, errOut)
		}
	}
}

func TestRunDryRunPrintsWouldImportAndWritesNothing(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "owner@rotra.club"))

	out, _, err := f.cli([]string{"--dry-run"}, f.env())

	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "mode=dry-run") || !strings.Contains(out, "admin pending=1 would_import=1") {
		t.Fatalf("stdout:\n%s", out)
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities`); n != 0 {
		t.Fatalf("dry run wrote %d identities", n)
	}
}

// An account that hits a database error makes the command fail (after printing the report).
func TestRunFailsWhenAnAccountFailed(t *testing.T) {
	f := newFx(t)
	f.execOn(t, f.target, `ALTER TABLE auth_identities ADD CONSTRAINT boom CHECK (login_key <> 'boom@rotra.club')`)
	f.admin(t, f.user(t, "boom@rotra.club"))

	out, _, err := f.cli(nil, f.env())

	if err == nil || !strings.Contains(err.Error(), "1 account") || !strings.Contains(out, "skipped admin failed ") {
		t.Fatalf("err %v\n%s", err, out)
	}
}

// Same database on both sides: refused before anything connects, whatever the spelling.
func TestRunRefusesTheSameDatabase(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "owner@rotra.club"))
	for name, env := range map[string]map[string]string{
		"identical": {"SUPABASE_DATABASE_URL": f.targetDSN, "DATABASE_URL": f.targetDSN},
		"respelled": {"SUPABASE_DATABASE_URL": f.targetDSN + "&application_name=x", "DATABASE_URL": f.targetDSN},
	} {
		_, _, err := f.cli(nil, env)
		if err == nil || !strings.Contains(err.Error(), "same database") {
			t.Fatalf("%s: err %v", name, err)
		}
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities`); n != 0 {
		t.Fatal("a run on the same database wrote")
	}
}

func TestSameDSN(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"postgres://u:p@db.example.com:5432/app", "postgres://other:q@DB.example.com/app?sslmode=require", true},
		{"postgres://u@h:5432/app", "host=h port=5432 dbname=app user=x", true},
		{"postgres://u@h:5432/app", "postgres://u@h:5432/other", false},
		{"postgres://u@h:5432/app", "postgres://u@h:5433/app", false},
		{"postgres://u@h1/app", "postgres://u@h2/app", false},
		{"not a dsn %%", "postgres://u@h/app", false},
	}
	for _, c := range cases {
		if got := sameDSN(c.a, c.b); got != c.want {
			t.Fatalf("sameDSN(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}

// Two differently spelled connections to one database are still caught once connected.
func TestSameDatabaseAfterConnecting(t *testing.T) {
	f := newFx(t)
	again := open(t, f.targetDSN)

	if same, checked := sameDatabase(f.ctx, f.target, again); !checked || !same {
		t.Fatalf("same database: same=%v checked=%v", same, checked)
	}
	if same, checked := sameDatabase(f.ctx, f.target, f.source); !checked || same {
		t.Fatalf("different databases: same=%v checked=%v", same, checked)
	}
}

func TestSourceIsOpenedReadOnly(t *testing.T) {
	f := newFx(t)
	pool, err := openPool(f.ctx, f.sourceDSN, true)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	_, err = pool.Exec(f.ctx, `INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'x@example.com')`)

	var pg *pgconn.PgError
	if !errors.As(err, &pg) || pg.Code != "25006" {
		t.Fatalf("a write on the source: %v, want read_only_sql_transaction", err)
	}
	if _, err := pool.Exec(f.ctx, `SELECT 1`); err != nil {
		t.Fatal(err)
	}
}

func TestRunNeedsItsEnvironment(t *testing.T) {
	f := newFx(t)
	secretDSN := "postgres://user:hunter2secret@127.0.0.1:1/db?sslmode=disable"
	cases := []struct {
		name string
		args []string
		env  map[string]string
		want string
	}{
		{"no target", nil, map[string]string{"SUPABASE_DATABASE_URL": f.sourceDSN}, "DATABASE_URL"},
		{"no source", nil, map[string]string{"DATABASE_URL": f.targetDSN}, "SUPABASE_DATABASE_URL"},
		{"verify needs no source", []string{"--verify"}, map[string]string{}, "DATABASE_URL"},
		{"verify and dry-run", []string{"--verify", "--dry-run"}, f.env(), "--verify"},
		{"stray argument", []string{"now"}, f.env(), "arguments"},
		{"unknown flag", []string{"--force"}, f.env(), "flag"},
		{"bad target dsn", nil, map[string]string{"SUPABASE_DATABASE_URL": f.sourceDSN, "DATABASE_URL": "::not a dsn::"}, "DATABASE_URL"},
		{"bad source dsn", nil, map[string]string{"SUPABASE_DATABASE_URL": "::not a dsn::", "DATABASE_URL": f.targetDSN}, "SUPABASE_DATABASE_URL"},
		{"unreachable target", nil, map[string]string{"SUPABASE_DATABASE_URL": f.sourceDSN, "DATABASE_URL": secretDSN}, "DATABASE_URL"},
		{"unreachable source", nil, map[string]string{"SUPABASE_DATABASE_URL": secretDSN, "DATABASE_URL": f.targetDSN}, "SUPABASE_DATABASE_URL"},
	}
	for _, c := range cases {
		out, errOut, err := f.cli(c.args, c.env)
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Fatalf("%s: err %v, want it to mention %q", c.name, err, c.want)
		}
		if strings.Contains(err.Error()+out+errOut, "hunter2secret") {
			t.Fatalf("%s: a password reached the output", c.name)
		}
	}
}

func TestRunStopsWhenTheContextIsDone(t *testing.T) {
	f := newFx(t)
	ctx, cancel := context.WithCancel(f.ctx)
	cancel()
	err := run(ctx, nil, func(k string) string { return f.env()[k] }, &bytes.Buffer{}, &bytes.Buffer{}, nil)
	if err == nil {
		t.Fatal("want an error")
	}
}

type failingWriter struct{}

func (failingWriter) Write([]byte) (int, error) { return 0, errors.New("closed") }

func TestRunReportsAnOutputError(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "owner@rotra.club"))
	for _, args := range [][]string{nil, {"--verify"}} {
		err := run(f.ctx, args, func(k string) string { return f.env()[k] }, failingWriter{}, &bytes.Buffer{}, nil)
		if err == nil || !strings.Contains(err.Error(), "closed") {
			t.Fatalf("%v: err %v", args, err)
		}
	}
}

func TestSameDatabaseNeedsBothServersToAnswer(t *testing.T) {
	f := newFx(t)
	dead := open(t, f.targetDSN)
	dead.Close()
	if _, checked := sameDatabase(f.ctx, dead, f.source); checked {
		t.Fatal("checked with a closed first pool")
	}
	if _, checked := sameDatabase(f.ctx, f.source, dead); checked {
		t.Fatal("checked with a closed second pool")
	}
}
