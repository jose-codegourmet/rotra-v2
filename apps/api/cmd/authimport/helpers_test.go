package main

import (
	"bytes"
	"context"
	"log/slog"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// base is the importer's clock in tests, a whole second so Postgres round-trips it exactly.
var base = time.Date(2026, 11, 18, 9, 0, 0, 0, time.UTC)

const goodPass = "correct horse battery staple"

// fx is one rehearsal: a migrated target database (the app database) and a separate source database
// holding a throwaway auth.users table.
//
// The source table mimics the columns of Supabase's auth.users that the tool reads (id, email,
// encrypted_password, banned_until, deleted_at) and nothing else. Hashes are built at test time with
// bcrypt, so no hash-shaped literal is committed.
type fx struct {
	ctx       context.Context
	source    *pgxpool.Pool
	target    *pgxpool.Pool
	sourceDSN string
	targetDSN string
	seq       atomic.Int64
	out       *bytes.Buffer
	logs      *bytes.Buffer
}

func newFx(t *testing.T) *fx {
	t.Helper()
	f := &fx{ctx: context.Background(), out: &bytes.Buffer{}, logs: &bytes.Buffer{}}
	f.targetDSN = testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, f.targetDSN)
	f.sourceDSN = testpg.NewDatabase(t)
	f.target = open(t, f.targetDSN)
	f.source = open(t, f.sourceDSN)
	f.execOn(t, f.source, `CREATE SCHEMA auth;
	  CREATE TABLE auth.users (
	    id uuid PRIMARY KEY,
	    email text,
	    encrypted_password text,
	    banned_until timestamptz,
	    deleted_at timestamptz
	  )`)
	return f
}

func open(t *testing.T, dsn string) *pgxpool.Pool {
	t.Helper()
	p, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(p.Close)
	return p
}

func (f *fx) execOn(t *testing.T, p *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := p.Exec(f.ctx, sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

func (f *fx) count(t *testing.T, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := f.target.QueryRow(f.ctx, sql, args...).Scan(&n); err != nil {
		t.Fatalf("count %q: %v", sql, err)
	}
	return n
}

// importer builds the importer over the fixture databases with the fixed clock.
func (f *fx) importer() *Importer {
	return &Importer{Source: f.source, Target: f.target, Now: func() time.Time { return base },
		Log: slog.New(slog.NewTextHandler(f.logs, nil))}
}

func bcryptHash(t *testing.T, pw string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	return string(h)
}

// userOpt tweaks a Supabase user.
type userOpt func(*srcRow)

type srcRow struct {
	email   any
	hash    any
	banned  any
	deleted any
}

func withHash(h any) userOpt         { return func(r *srcRow) { r.hash = h } }
func withEmail(e any) userOpt        { return func(r *srcRow) { r.email = e } }
func banned(until time.Time) userOpt { return func(r *srcRow) { r.banned = until } }
func deleted(at time.Time) userOpt   { return func(r *srcRow) { r.deleted = at } }

// user adds a Supabase user with a bcrypt hash of goodPass (unless overridden) and returns its id.
func (f *fx) user(t *testing.T, email string, opts ...userOpt) uuid.UUID {
	t.Helper()
	r := &srcRow{email: email}
	for _, o := range opts {
		o(r)
	}
	if r.hash == nil {
		r.hash = bcryptHash(t, goodPass)
	}
	id := uuid.New()
	f.execOn(t, f.source, `INSERT INTO auth.users (id, email, encrypted_password, banned_until, deleted_at)
	  VALUES ($1, $2, $3, $4, $5)`, id, r.email, r.hash, r.banned, r.deleted)
	return id
}

// club adds a club account on provider supabase pointing at subject, and returns the club id.
func (f *fx) club(t *testing.T, username string, subject any) uuid.UUID {
	t.Helper()
	id := uuid.New()
	f.execOn(t, f.target, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $3, (SELECT id FROM location_codes ORDER BY id LIMIT 1), 'Somewhere', 'free', $4, now())`,
		id, "Club "+username, "club-"+id.String(), uuid.New())
	// A provisioned club (it has a Supabase user) has provisioned_at set; an unprovisioned one has neither.
	f.execOn(t, f.target, `INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, updated_at)
	  VALUES ($1, $2, 'supabase', $3, CASE WHEN $3::uuid IS NULL THEN NULL ELSE $4::timestamptz END, now())`, id, username, subject, base)
	return id
}

// player adds a claimed player on provider supabase. contactEmail is player_private_contacts.email.
func (f *fx) player(t *testing.T, contactEmail string, subject uuid.UUID) uuid.UUID {
	t.Helper()
	id := uuid.New()
	n := f.seq.Add(1)
	tx, err := f.target.Begin(f.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(f.ctx) }()
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO players (id, full_name, updated_at) VALUES ($1, 'Test Player', now())`, []any{id}},
		{`INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`,
			[]any{id, "+63917" + strconv.FormatInt(1000000+n, 10), contactEmail}},
		{`INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at)
		  VALUES ($1, 'supabase', $2, $3, 1, now())`, []any{id, subject, base}},
	} {
		if _, err := tx.Exec(f.ctx, q.sql, q.args...); err != nil {
			t.Fatalf("seed player: %v", err)
		}
	}
	if err := tx.Commit(f.ctx); err != nil {
		t.Fatal(err)
	}
	return id
}

func (f *fx) admin(t *testing.T, subject uuid.UUID) uuid.UUID {
	t.Helper()
	id := uuid.New()
	f.execOn(t, f.target, `INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at)
	  VALUES ($1, 'supabase', $2, true, 'Owner', now())`, id, subject)
	return id
}

type accountRow struct {
	provider string
	subject  uuid.UUID
}

func (f *fx) accountOf(t *testing.T, table, pk string, id uuid.UUID) accountRow {
	t.Helper()
	var r accountRow
	// table and pk are constants of the tests.
	if err := f.target.QueryRow(f.ctx, `SELECT auth_provider, auth_subject FROM `+table+` WHERE `+pk+` = $1`, id).
		Scan(&r.provider, &r.subject); err != nil {
		t.Fatalf("account %s: %v", id, err)
	}
	return r
}

type identityRow struct {
	id       uuid.UUID
	audience string
	loginKey string
	hash     string
	scheme   string
	disabled *time.Time
	changed  time.Time
}

func (f *fx) identityFor(t *testing.T, audience, loginKey string) identityRow {
	t.Helper()
	var r identityRow
	if err := f.target.QueryRow(f.ctx, `SELECT id, audience, login_key, password_hash, password_scheme, disabled_at, password_changed_at
	  FROM auth_identities WHERE audience = $1 AND login_key = $2`, audience, loginKey).
		Scan(&r.id, &r.audience, &r.loginKey, &r.hash, &r.scheme, &r.disabled, &r.changed); err != nil {
		t.Fatalf("identity %s/%s: %v", audience, loginKey, err)
	}
	return r
}
