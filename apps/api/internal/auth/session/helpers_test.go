package session_test

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"fmt"
	"io"
	"log/slog"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// base is a whole-second "now": Postgres keeps microseconds and passes whole seconds.
var base = time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)

// fakeClock is a settable clock safe for concurrent use.
type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = c.t.Add(d)
}

func (c *fakeClock) Set(t time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = t
}

type env struct {
	ctx      context.Context
	pool     *pgxpool.Pool
	st       *store.Store
	clk      *fakeClock
	key      ed25519.PrivateKey
	keys     *pass.KeySet
	signer   *pass.Signer
	verifier *pass.Verifier
	hasher   *password.Hasher
	tuning   config.AuthTuning
	svc      *session.Service
	seq      atomic.Int64
}

// newEnv migrates a throwaway database and builds a Service with a throwaway signing key. mut changes the
// tuning before the Service is built.
func newEnv(t *testing.T, mut ...func(*config.AuthTuning)) *env {
	t.Helper()
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxConns = 40
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	e := &env{ctx: context.Background(), pool: pool, st: store.New(pool), clk: &fakeClock{t: base}, tuning: config.DefaultAuthTuning()}
	for _, m := range mut {
		m(&e.tuning)
	}
	e.key, err = pass.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	e.keys, err = pass.NewKeySet(e.key.Public().(ed25519.PublicKey))
	if err != nil {
		t.Fatal(err)
	}
	e.hasher, err = password.NewHasher(password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}, 2)
	if err != nil {
		t.Fatal(err)
	}
	e.svc = e.buildService(t, e.key, e.keys)
	return e
}

// buildService builds another Service on the same database, clock and tuning (a key rotation, a restart).
func (e *env) buildService(t *testing.T, key ed25519.PrivateKey, keys *pass.KeySet) *session.Service {
	t.Helper()
	signer, err := pass.NewSigner(key, 0)
	if err != nil {
		t.Fatal(err)
	}
	verifier, err := pass.NewVerifier(keys, 0)
	if err != nil {
		t.Fatal(err)
	}
	e.signer, e.verifier = signer, verifier
	svc, err := session.New(session.Deps{
		Store: e.st, Signer: signer, Verifier: verifier, Hasher: e.hasher, Tuning: e.tuning, SigningKey: key,
		Clock: e.clk.Now, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	if err != nil {
		t.Fatal(err)
	}
	return svc
}

func (e *env) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := e.pool.Exec(e.ctx, sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

func (e *env) count(t *testing.T, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := e.pool.QueryRow(e.ctx, sql, args...).Scan(&n); err != nil {
		t.Fatalf("count %q: %v", sql, err)
	}
	return n
}

// events counts auth_events of one kind.
func (e *env) events(t *testing.T, event store.EventType) int {
	t.Helper()
	return e.count(t, `SELECT count(*) FROM auth_events WHERE event = $1`, string(event))
}

func (e *env) session(t *testing.T, id uuid.UUID) store.Session {
	t.Helper()
	s, err := e.st.GetSession(e.ctx, id)
	if err != nil {
		t.Fatalf("get session: %v", err)
	}
	return s
}

// fakeHash: nothing here looks like a real hash or secret.
const fakeHash = "fake-hash-for-tests"

// acct is a signed-in-capable account: its identity and the account row linked to it.
type acct struct {
	ident     store.Identity
	accountID uuid.UUID
}

func (e *env) identity(t *testing.T, aud store.Audience, key string) store.Identity {
	t.Helper()
	id, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{
		Audience: aud, LoginKey: key, PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base,
	})
	if err != nil {
		t.Fatalf("insert identity: %v", err)
	}
	return id
}

func (e *env) newClub(t *testing.T, key string) acct {
	t.Helper()
	ident := e.identity(t, store.AudienceClub, key)
	id := uuid.New()
	e.exec(t, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $2, (SELECT id FROM location_codes ORDER BY id LIMIT 1), 'Somewhere', 'free', $3, now())`,
		id, "club-"+id.String(), uuid.New())
	e.exec(t, `INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, updated_at)
	  VALUES ($1, $2, 'rotra', $3, $4, now())`, id, key, ident.ID, base)
	return acct{ident: ident, accountID: id}
}

func (e *env) newPlayer(t *testing.T, key string) acct {
	t.Helper()
	ident := e.identity(t, store.AudiencePlayer, key)
	id := uuid.New()
	n := e.seq.Add(1)
	tx, err := e.pool.Begin(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(e.ctx) }()
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO players (id, full_name, updated_at) VALUES ($1, 'Test Player', now())`, []any{id}},
		{`INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`,
			[]any{id, "+63917" + strconv.FormatInt(1000000+n, 10), key}},
		{`INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at)
		  VALUES ($1, 'rotra', $2, $3, 1, now())`, []any{id, ident.ID, base}},
	} {
		if _, err := tx.Exec(e.ctx, q.sql, q.args...); err != nil {
			t.Fatalf("seed player: %v", err)
		}
	}
	if err := tx.Commit(e.ctx); err != nil {
		t.Fatalf("seed player commit: %v", err)
	}
	return acct{ident: ident, accountID: id}
}

func (e *env) newAdmin(t *testing.T, key string) acct {
	t.Helper()
	ident := e.identity(t, store.AudienceAdmin, key)
	id := uuid.New()
	e.exec(t, `INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at)
	  VALUES ($1, 'rotra', $2, true, 'Owner', now())`, id, ident.ID)
	return acct{ident: ident, accountID: id}
}

func (e *env) accountFor(t *testing.T, aud store.Audience, key string) acct {
	t.Helper()
	switch aud {
	case store.AudiencePlayer:
		return e.newPlayer(t, key)
	case store.AudienceAdmin:
		return e.newAdmin(t, key)
	default:
		return e.newClub(t, key)
	}
}

var audiences = []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin}

// issue signs an account in (no device) at the current fake time.
func (e *env) issue(t *testing.T, a acct) session.Issued {
	t.Helper()
	return e.issueOn(t, a, nil, "Chrome on Android")
}

func (e *env) issueOn(t *testing.T, a acct, device *uuid.UUID, label string) session.Issued {
	t.Helper()
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: a.ident, AccountID: a.accountID, DeviceID: device, DeviceLabel: label})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	return iss
}

func digestOf(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

func ptr[T any](v T) *T { return &v }

func mustEqual[T comparable](t *testing.T, what string, got, want T) {
	t.Helper()
	if got != want {
		t.Fatalf("%s: got %v, want %v", what, got, want)
	}
}

func uniq(prefix string, i int) string { return fmt.Sprintf("%s-%d", prefix, i) }
