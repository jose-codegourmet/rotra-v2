package signin_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/signin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

const (
	secret   = "test-proxy-secret"
	goodPass = "correct horse battery staple"
)

// base is a whole-second "now": Postgres keeps microseconds and passes whole seconds.
var base = time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)

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

type env struct {
	ctx      context.Context
	pool     *pgxpool.Pool
	st       *store.Store
	clk      *fakeClock
	key      ed25519.PrivateKey
	verifier *pass.Verifier
	hasher   *password.Hasher
	params   password.Params
	svc      *session.Service
	handler  http.Handler
	seq      atomic.Int64
	// hook, when set, is the Deps.PlayerSession of the routes.
	hook func(http.ResponseWriter, *http.Request, uuid.UUID)
}

// newEnv migrates a throwaway database and serves the sign-in routes behind the real proxy guard.
func newEnv(t *testing.T, mut ...func(*config.AuthTuning)) *env {
	t.Helper()
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxConns = 20
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	tuning := config.DefaultAuthTuning()
	for _, m := range mut {
		m(&tuning)
	}
	e := &env{ctx: context.Background(), pool: pool, st: store.New(pool), clk: &fakeClock{t: base}}
	e.key, err = pass.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	keys, err := pass.NewKeySet(e.key.Public().(ed25519.PublicKey))
	if err != nil {
		t.Fatal(err)
	}
	signer, err := pass.NewSigner(e.key, 0)
	if err != nil {
		t.Fatal(err)
	}
	e.verifier, err = pass.NewVerifier(keys, 0)
	if err != nil {
		t.Fatal(err)
	}
	e.params = password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}
	e.hasher, err = password.NewHasher(e.params, 2)
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e.svc, err = session.New(session.Deps{
		Store: e.st, Signer: signer, Verifier: e.verifier, Hasher: e.hasher, Tuning: tuning, SigningKey: e.key,
		Clock: e.clk.Now, Logger: log,
	})
	if err != nil {
		t.Fatal(err)
	}
	register, err := signin.Register(signin.Deps{Service: e.svc, Store: e.st, Verifier: e.verifier, Clock: e.clk.Now, Logger: log,
		PlayerSession: func(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
			if e.hook != nil {
				e.hook(w, r, id)
			}
		}})
	if err != nil {
		t.Fatal(err)
	}
	e.handler = httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: httpapi.NewReadiness(), ProxySecret: secret}, register)
	return e
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

func (e *env) events(t *testing.T, event store.EventType) int {
	t.Helper()
	return e.count(t, `SELECT count(*) FROM auth_events WHERE event = $1`, string(event))
}

func (e *env) sessions(t *testing.T) int { return e.count(t, `SELECT count(*) FROM auth_sessions`) }

func (e *env) argonHash(t *testing.T, pw string) string {
	t.Helper()
	h, err := e.params.Hash(pw)
	if err != nil {
		t.Fatal(err)
	}
	return h
}

// acct is an account the sign-in can find: its identity and the account row linked to it.
type acct struct {
	ident     store.Identity
	accountID uuid.UUID
}

func (e *env) identity(t *testing.T, aud store.Audience, key, hash, scheme string) store.Identity {
	t.Helper()
	id, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{Audience: aud, LoginKey: key, PasswordHash: hash, PasswordScheme: scheme, Now: base})
	if err != nil {
		t.Fatalf("insert identity: %v", err)
	}
	return id
}

func (e *env) newClub(t *testing.T, username, name string) acct {
	t.Helper()
	ident := e.identity(t, store.AudienceClub, username, e.argonHash(t, goodPass), store.SchemeArgon2id)
	id := uuid.New()
	e.exec(t, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $3, (SELECT id FROM location_codes ORDER BY id LIMIT 1), 'Somewhere', 'free', $4, now())`,
		id, name, name+id.String(), uuid.New())
	e.exec(t, `INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, updated_at)
	  VALUES ($1, $2, 'rotra', $3, $4, now())`, id, username, ident.ID, base)
	return acct{ident: ident, accountID: id}
}

func (e *env) newPlayer(t *testing.T, email, fullName string) acct {
	t.Helper()
	ident := e.identity(t, store.AudiencePlayer, email, e.argonHash(t, goodPass), store.SchemeArgon2id)
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
		{`INSERT INTO players (id, full_name, updated_at) VALUES ($1, $2, now())`, []any{id, fullName}},
		{`INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`,
			[]any{id, "+63917" + strconv.FormatInt(1000000+n, 10), email}},
		{`INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at)
		  VALUES ($1, 'rotra', $2, $3, 1, now())`, []any{id, ident.ID, base}},
	} {
		if _, err := tx.Exec(e.ctx, q.sql, q.args...); err != nil {
			t.Fatalf("seed player: %v", err)
		}
	}
	if err := tx.Commit(e.ctx); err != nil {
		t.Fatal(err)
	}
	return acct{ident: ident, accountID: id}
}

func (e *env) newAdmin(t *testing.T, email string) acct {
	t.Helper()
	ident := e.identity(t, store.AudienceAdmin, email, e.argonHash(t, goodPass), store.SchemeArgon2id)
	id := uuid.New()
	e.exec(t, `INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at)
	  VALUES ($1, 'rotra', $2, true, 'Owner', now())`, id, ident.ID)
	return acct{ident: ident, accountID: id}
}

// req is one request through the whole handler (proxy guard included).
type req struct {
	method, path string
	app          string // X-Rotra-App
	body         string
	noSecret     bool
	ip           string // X-Real-IP
	cookies      []*http.Cookie
	bearer       string
}

func (e *env) do(r req) *httptest.ResponseRecorder {
	var body io.Reader
	if r.body != "" {
		body = bytes.NewReader([]byte(r.body))
	}
	hr := httptest.NewRequest(r.method, r.path, body)
	hr.Host = "localhost:9000"
	if !r.noSecret {
		hr.Header.Set(httpapi.ProxySecretHeader, secret)
	}
	if r.app != "" {
		hr.Header.Set("X-Rotra-App", r.app)
	}
	if r.ip != "" {
		hr.Header.Set("X-Real-IP", r.ip)
	}
	if r.bearer != "" {
		hr.Header.Set("Authorization", "Bearer "+r.bearer)
	}
	for _, c := range r.cookies {
		hr.AddCookie(c)
	}
	w := httptest.NewRecorder()
	e.handler.ServeHTTP(w, hr)
	return w
}

func (e *env) signIn(app, body string) *httptest.ResponseRecorder {
	return e.do(req{method: "POST", path: "/api/auth/sign-in", app: app, body: body})
}

func cred(identifier, pw string) string {
	b, _ := json.Marshal(map[string]string{"identifier": identifier, "password": pw})
	return string(b)
}

// decode parses a JSON body into an any.
func decode(t *testing.T, w *httptest.ResponseRecorder) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatalf("body is not JSON: %q (%v)", w.Body.String(), err)
	}
	return v
}

// errBody returns the error code and message of an envelope.
func errBody(t *testing.T, w *httptest.ResponseRecorder) (code, message string) {
	t.Helper()
	m, ok := decode(t, w).(map[string]any)
	if !ok {
		t.Fatalf("not an object: %q", w.Body.String())
	}
	e, ok := m["error"].(map[string]any)
	if !ok {
		t.Fatalf("no error envelope: %q", w.Body.String())
	}
	code, _ = e["code"].(string)
	message, _ = e["message"].(string)
	return code, message
}

// cookie finds a Set-Cookie of the response by name.
func cookie(w *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func bcryptHash(t *testing.T, pw string, cost int) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(pw), cost)
	if err != nil {
		t.Fatal(err)
	}
	return string(h)
}
