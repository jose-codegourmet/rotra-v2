package store_test

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// base is a fixed "now" for tests that do not care about the wall clock. Postgres keeps microseconds, so
// every time written here is a whole second.
var base = time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)

type env struct {
	ctx  context.Context
	pool *pgxpool.Pool
	s    *store.Store
}

// newEnv migrates a throwaway database and opens a pool (at least 4 connections: the lock tests hold two).
func newEnv(t *testing.T) *env {
	t.Helper()
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxConns = 8
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return &env{ctx: context.Background(), pool: pool, s: store.New(pool)}
}

func (e *env) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := e.pool.Exec(e.ctx, sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

// fake values only: nothing here looks like a real hash or secret.
const fakeHash = "fake-hash-for-tests"

func dg(b byte) []byte { return bytes.Repeat([]byte{b}, 32) }

func ptr[T any](v T) *T { return &v }

func (e *env) identity(t *testing.T, aud store.Audience, key string) store.Identity {
	t.Helper()
	id, err := e.s.InsertIdentity(e.ctx, store.NewIdentity{
		Audience: aud, LoginKey: key, PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base,
	})
	if err != nil {
		t.Fatalf("insert identity: %v", err)
	}
	return id
}

// club seeds a club and its account row. subject nil leaves auth_subject NULL (not provisioned).
func (e *env) club(t *testing.T, subject *uuid.UUID, provisioned bool, disabled *time.Time) uuid.UUID {
	t.Helper()
	id := uuid.New()
	e.exec(t, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $2, (SELECT id FROM location_codes ORDER BY id LIMIT 1), 'Somewhere', 'free', $3, now())`,
		id, "club-"+id.String(), uuid.New())
	var prov *time.Time
	if provisioned {
		prov = ptr(base)
	}
	e.exec(t, `INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, disabled_at, updated_at)
	  VALUES ($1, $2, 'rotra', $3, $4, $5, now())`, id, "u-"+id.String(), subject, prov, disabled)
	return id
}

// clubSession signs a fresh club identity in on a new club (no device).
func (e *env) clubSession(t *testing.T, key string, digest byte) (store.Identity, uuid.UUID, store.Session) {
	t.Helper()
	ident := e.identity(t, store.AudienceClub, key)
	clubID := e.club(t, &ident.ID, true, nil)
	s, err := e.s.InsertSession(e.ctx, store.NewSession{
		IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID, DeviceLabel: "Chrome on Android",
		RefreshDigest: dg(digest), Now: base, ExpiresAt: base.Add(30 * 24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("insert club session: %v", err)
	}
	return ident, clubID, s
}

// playerSession signs a fresh player identity in.
func (e *env) playerSession(t *testing.T, key string, digest byte, now time.Time) (store.Identity, store.Session) {
	t.Helper()
	ident := e.identity(t, store.AudiencePlayer, key)
	s, err := e.s.InsertSession(e.ctx, store.NewSession{
		IdentityID: ident.ID, Audience: store.AudiencePlayer, DeviceLabel: "Safari on iPhone",
		RefreshDigest: dg(digest), Now: now, ExpiresAt: now.Add(30 * 24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("insert player session: %v", err)
	}
	return ident, s
}

func sameTime(a, b time.Time) bool { return a.Equal(b) }
