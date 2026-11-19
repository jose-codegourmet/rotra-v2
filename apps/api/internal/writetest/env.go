package writetest

import (
	"context"
	"crypto/ed25519"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
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
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

// ProxySecret is the proxy secret the test server is built with; Do sends it.
const ProxySecret = "test-proxy-secret"

// Clock is a settable clock shared by the routes and the sign-in service.
type Clock struct {
	mu sync.Mutex
	t  time.Time
}

// Now is the clock's instant.
func (c *Clock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

// Set moves the clock.
func (c *Clock) Set(t time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = t
}

// Build registers the routes under test. It gets what a route package is built from: the pool, the authenticator
// of the sign-in service, a logger (it writes to stderr when ROTRA_TEST_LOG is set) and the shared clock.
type Build func(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux)

// Env is the routes behind the real proxy guard, on a migrated database, with a sign-in service on the same clock.
type Env struct {
	Ctx     context.Context
	Pool    *pgxpool.Pool
	Store   *store.Store
	Service *session.Service
	Clock   *Clock
	Handler http.Handler

	adminIdentities bool
}

// NewEnv makes a migrated database, a sign-in service and the routes build registers.
func NewEnv(t *testing.T, now time.Time, build Build) *Env {
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
	logOut := io.Writer(io.Discard)
	if os.Getenv("ROTRA_TEST_LOG") != "" {
		logOut = os.Stderr // set it to see why a route answered 500
	}
	log := slog.New(slog.NewTextHandler(logOut, nil))
	e := &Env{Ctx: context.Background(), Pool: pool, Store: store.New(pool), Clock: &Clock{t: now}}
	e.Service, err = session.New(session.Deps{
		Store: e.Store, Signer: signer, Verifier: verifier, Hasher: hasher, Tuning: config.DefaultAuthTuning(),
		SigningKey: key, Clock: e.Clock.Now, Logger: log,
	})
	if err != nil {
		t.Fatal(err)
	}
	register := build(pool, e.Service.Authenticator(), log, e.Clock.Now)
	e.Handler = httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: httpapi.NewReadiness(), ProxySecret: ProxySecret}, register)
	return e
}

// Exec runs one statement.
func (e *Env) Exec(t testing.TB, sql string, args ...any) {
	t.Helper()
	if _, err := e.Pool.Exec(e.Ctx, sql, args...); err != nil {
		t.Fatalf("exec %.80q: %v", sql, err)
	}
}

// Setup runs statements on one connection with triggers and foreign keys off, the way the capture does.
func (e *Env) Setup(t testing.TB, stmts ...[]string) {
	t.Helper()
	conn, err := e.Pool.Acquire(e.Ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	if _, err := conn.Exec(e.Ctx, `SET session_replication_role = replica`); err != nil {
		t.Fatal(err)
	}
	for _, list := range stmts {
		for _, s := range list {
			if _, err := conn.Exec(e.Ctx, s); err != nil {
				t.Fatalf("%.80s: %v", s, err)
			}
		}
	}
	if _, err := conn.Exec(e.Ctx, `SET session_replication_role = DEFAULT`); err != nil {
		t.Fatal(err)
	}
}

// RelinkAdmins turns the capture's 'supabase' admin accounts into Go sign-in identities: one identity per account,
// with the account's subject as its ID and the display name as its login. Run it after every load of the seed,
// which puts the 'supabase' provider back; the identities are made once.
func (e *Env) RelinkAdmins(t testing.TB) {
	t.Helper()
	e.Setup(t, []string{`UPDATE admin_accounts SET auth_provider = 'rotra'`})
	if e.adminIdentities {
		return
	}
	e.adminIdentities = true
	rows, err := e.Pool.Query(e.Ctx, `SELECT auth_subject, lower(replace(display_name, ' ', '-')) FROM admin_accounts ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	type acc struct {
		subject uuid.UUID
		name    string
	}
	var accs []acc
	for rows.Next() {
		var a acc
		if err := rows.Scan(&a.subject, &a.name); err != nil {
			t.Fatal(err)
		}
		accs = append(accs, a)
	}
	rows.Close()
	for _, a := range accs {
		if _, err := e.Store.InsertIdentity(e.Ctx, store.NewIdentity{
			ID: a.subject, Audience: store.AudienceAdmin, LoginKey: a.name, PasswordHash: "fake-hash-for-tests",
			PasswordScheme: store.SchemeArgon2id, Now: e.Clock.Now(),
		}); err != nil {
			t.Fatalf("insert admin identity: %v", err)
		}
	}
}

// AdminPass signs the admin behind a subject in at the current fake time and returns the access pass. A subject
// with no identity gets no pass (the request goes out signed out).
func (e *Env) AdminPass(t testing.TB, subject string) string {
	t.Helper()
	id := uuid.MustParse(subject)
	ident, err := e.Store.GetIdentityByID(e.Ctx, id)
	if err != nil {
		return "" // no identity behind the subject: nothing to sign in with, the request is signed out
	}
	var account uuid.UUID
	if err := e.Pool.QueryRow(e.Ctx, `SELECT id FROM admin_accounts WHERE auth_subject = $1`, id).Scan(&account); err != nil {
		t.Fatalf("admin of %s: %v", subject, err)
	}
	iss, err := e.Service.Issue(e.Ctx, session.IssueInput{Identity: ident, AccountID: account, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	return iss.AccessPass
}

// Request is one request to the routes.
type Request struct {
	Method, Path, App string
	Bearer            string
	// Body is sent as is; empty sends no body.
	Body string
	// NoSecret leaves the proxy secret out.
	NoSecret bool
}

// Do sends the request through the proxy guard and returns what was answered.
func (e *Env) Do(r Request) *httptest.ResponseRecorder {
	hr := httptest.NewRequest(r.Method, r.Path, strings.NewReader(r.Body))
	hr.Host = "localhost:9002"
	if !r.NoSecret {
		hr.Header.Set(httpapi.ProxySecretHeader, ProxySecret)
	}
	if r.App != "" {
		hr.Header.Set(session.AppHeader, r.App)
	}
	if r.Bearer != "" {
		hr.Header.Set("Authorization", "Bearer "+r.Bearer)
	}
	if r.Body != "" {
		hr.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	e.Handler.ServeHTTP(w, hr)
	return w
}

// DoAll sends the requests at the same moment, each on its own goroutine released together, and returns the answers
// in the order of the requests. It is how a race is run; the order the server handles them in is not decided.
func (e *Env) DoAll(reqs []Request) []*httptest.ResponseRecorder {
	out := make([]*httptest.ResponseRecorder, len(reqs))
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := range reqs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			out[i] = e.Do(reqs[i])
		}()
	}
	close(start)
	wg.Wait()
	return out
}

// Reseed puts the database back to the seed: the seed SQL (which deletes what it inserts), the Go sign-in identities
// of its admins, then the scenario's statements. Replay does it before every case; a test of its own does the same.
func (e *Env) Reseed(t testing.TB, seed string, scenario []string) {
	t.Helper()
	e.Exec(t, seed)
	e.RelinkAdmins(t)
	e.Setup(t, scenario)
}

// ReadSeed reads a seed file of dir.
func ReadSeed(t testing.TB, dir, file string) string {
	t.Helper()
	raw, err := readFile(dir, file)
	if err != nil {
		t.Fatal(err)
	}
	return string(raw)
}
