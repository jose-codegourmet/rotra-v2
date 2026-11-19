package signedin_test

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

const secret = "test-proxy-secret"

type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *fakeClock) Set(t time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = t
}

// env is the signed-in routes behind the real proxy guard, on a migrated database, with a sign-in service
// that shares one settable clock with the routes.
type env struct {
	ctx     context.Context
	pool    *pgxpool.Pool
	st      *store.Store
	svc     *session.Service
	clk     *fakeClock
	handler http.Handler
	// approved serves the same database with a rank algorithm approved (#247); none is in the product.
	approved http.Handler
}

// queueOrigin is the paired Queue origin the stats read allows.
const queueOrigin = "http://localhost:9000"

func newEnv(t *testing.T, now time.Time) *env {
	t.Helper()
	pool := testpg.NewMigratedPool(t, 20)
	key, err := pass.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	keys, err := pass.NewKeySet(key.Public().(ed25519.PublicKey))
	if err != nil {
		t.Fatal(err)
	}
	signer, err := pass.NewSigner(key, 0)
	if err != nil {
		t.Fatal(err)
	}
	verifier, err := pass.NewVerifier(keys, 0)
	if err != nil {
		t.Fatal(err)
	}
	hasher, err := password.NewHasher(password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}, 2)
	if err != nil {
		t.Fatal(err)
	}
	var logOut io.Writer = io.Discard
	if os.Getenv("ROTRA_TEST_LOG") != "" {
		logOut = os.Stderr // set it to see why a route answered 500
	}
	log := slog.New(slog.NewTextHandler(logOut, nil))
	e := &env{ctx: context.Background(), pool: pool, st: store.New(pool), clk: &fakeClock{t: now}}
	e.svc, err = session.New(session.Deps{
		Store: e.st, Signer: signer, Verifier: verifier, Hasher: hasher, Tuning: config.DefaultAuthTuning(),
		SigningKey: key, Clock: e.clk.Now, Logger: log,
	})
	if err != nil {
		t.Fatal(err)
	}
	build := func(approved []string) http.Handler {
		register, err := signedin.Register(signedin.Deps{
			Pool: pool, Auth: e.svc.Authenticator(), Logger: log, Now: e.clk.Now,
			Limiter:            httpapi.NewRateLimiter(1_000_000, nil), // the limit has its own tests
			ApprovedAlgorithms: approved, QueueOrigins: []string{queueOrigin},
		})
		if err != nil {
			t.Fatal(err)
		}
		return httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: httpapi.NewReadiness(), ProxySecret: secret}, register)
	}
	e.handler = build(nil)
	e.approved = build([]string{"rank-test-v1"})
	return e
}

func (e *env) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := e.pool.Exec(e.ctx, sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

// setup runs statements on one connection with triggers and foreign keys off, the way the capture does.
func (e *env) setup(t *testing.T, stmts ...[]string) {
	t.Helper()
	conn, err := e.pool.Acquire(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	if _, err := conn.Exec(e.ctx, `SET session_replication_role = replica`); err != nil {
		t.Fatal(err)
	}
	for _, list := range stmts {
		for _, s := range list {
			if _, err := conn.Exec(e.ctx, s); err != nil {
				t.Fatalf("%s: %v", s, err)
			}
		}
	}
	if _, err := conn.Exec(e.ctx, `SET session_replication_role = DEFAULT`); err != nil {
		t.Fatal(err)
	}
}

// loadSeed applies a seed file from testdata.
func (e *env) loadSeed(t *testing.T, name string) {
	t.Helper()
	b, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	e.exec(t, string(b))
}

// relinkPlayers turns the capture's 'supabase' player accounts into Go sign-in identities: one identity per
// account, with the account's subject as its ID and the contact email as its login. A subject in passwordless
// has an identity with no password (an account made with Google).
func (e *env) relinkPlayers(t *testing.T, passwordless map[string]bool) {
	t.Helper()
	rows, err := e.pool.Query(e.ctx, `SELECT a.player_id, a.auth_subject, c.email FROM player_accounts a JOIN player_private_contacts c ON c.player_id = a.player_id`)
	if err != nil {
		t.Fatal(err)
	}
	type acc struct {
		player, subject uuid.UUID
		email           string
	}
	var accs []acc
	for rows.Next() {
		var a acc
		if err := rows.Scan(&a.player, &a.subject, &a.email); err != nil {
			t.Fatal(err)
		}
		accs = append(accs, a)
	}
	rows.Close()
	for _, a := range accs {
		hash := "fake-hash-for-tests"
		if passwordless[a.subject.String()] {
			hash = ""
		}
		if _, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{
			ID: a.subject, Audience: store.AudiencePlayer, LoginKey: a.email, PasswordHash: hash, PasswordScheme: store.SchemeArgon2id, Now: e.clk.Now(),
		}); err != nil {
			t.Fatalf("insert identity: %v", err)
		}
	}
	e.exec(t, `UPDATE player_accounts SET auth_provider = 'rotra'`)
}

// accessPass signs the player behind a subject in at the current fake time and returns the access pass.
func (e *env) accessPass(t *testing.T, subject string) string {
	t.Helper()
	id := uuid.MustParse(subject)
	ident, err := e.st.GetIdentityByID(e.ctx, id)
	if err != nil {
		t.Fatalf("identity %s: %v", subject, err)
	}
	var playerID uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT player_id FROM player_accounts WHERE auth_subject = $1`, id).Scan(&playerID); err != nil {
		t.Fatalf("account of %s: %v", subject, err)
	}
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: ident, AccountID: playerID, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	return iss.AccessPass
}

type req struct {
	path, app string
	bearer    string
	noSecret  bool
	origin    string
	approved  bool
}

func (e *env) do(r req) *httptest.ResponseRecorder {
	hr := httptest.NewRequest(http.MethodGet, r.path, nil)
	hr.Host = "localhost:9001"
	if !r.noSecret {
		hr.Header.Set(httpapi.ProxySecretHeader, secret)
	}
	if r.app != "" {
		hr.Header.Set(session.AppHeader, r.app)
	}
	if r.bearer != "" {
		hr.Header.Set("Authorization", "Bearer "+r.bearer)
	}
	if r.origin != "" {
		hr.Header.Set("Origin", r.origin)
	}
	w := httptest.NewRecorder()
	h := e.handler
	if r.approved {
		h = e.approved
	}
	h.ServeHTTP(w, hr)
	return w
}

func decodeJSON(t *testing.T, b []byte) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("not JSON: %q (%v)", b, err)
	}
	return v
}

func errCode(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	m, _ := decodeJSON(t, w.Body.Bytes()).(map[string]any)
	e, _ := m["error"].(map[string]any)
	code, _ := e["code"].(string)
	return code
}
