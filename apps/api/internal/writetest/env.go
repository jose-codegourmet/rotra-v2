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

// BuildFull is Build for routes that need the whole sign-in service (a public route that signs a player in), not only
// the authenticator.
type BuildFull func(pool *pgxpool.Pool, svc *session.Service, st *store.Store, log *slog.Logger, now func() time.Time) func(*http.ServeMux)

// Env is the routes behind the real proxy guard, on a migrated database, with a sign-in service on the same clock.
type Env struct {
	Ctx     context.Context
	Pool    *pgxpool.Pool
	Store   *store.Store
	Service *session.Service
	Clock   *Clock
	Handler http.Handler

	adminIdentities bool
	// Players makes Reseed relink the player accounts too (Replay sets it for the Player app's case files; an Admin
	// seed keeps its accounts as they are).
	Players bool
}

// appHosts are the dev hosts of the apps, as the browser sends them in the Host header.
var appHosts = map[string]string{"club": "localhost:9000", "player": "localhost:9001", "admin": "localhost:9002"}

// NewEnv makes a migrated database, a sign-in service and the routes build registers.
func NewEnv(t *testing.T, now time.Time, build Build) *Env {
	t.Helper()
	return NewEnvFull(t, now, func(pool *pgxpool.Pool, svc *session.Service, _ *store.Store, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
		return build(pool, svc.Authenticator(), log, now)
	})
}

// NewEnvFull is NewEnv for a build that takes the sign-in service and its store.
func NewEnvFull(t *testing.T, now time.Time, build BuildFull) *Env {
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
	register := build(pool, e.Service, e.Store, log, e.Clock.Now)
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

// RelinkPlayers turns the capture's player accounts into Go sign-in identities. An account whose subject already
// has an identity (a seed may insert them) keeps it; any other gets one with the account's subject as its ID, its
// contact email as the login (or "player-<id>" when it has none) and a password. It also sets the provider to 'rotra',
// the one the Go sign-in knows. Run it after every load of the seed, which may put the provider back.
func (e *Env) RelinkPlayers(t testing.TB) {
	t.Helper()
	e.Setup(t, []string{`UPDATE player_accounts SET auth_provider = 'rotra'`})
	rows, err := e.Pool.Query(e.Ctx, `SELECT a.auth_subject, COALESCE(lower(c.email), 'player-' || a.player_id::text)
		FROM player_accounts a LEFT JOIN player_private_contacts c ON c.player_id = a.player_id
		WHERE NOT EXISTS (SELECT 1 FROM auth_identities i WHERE i.id = a.auth_subject) ORDER BY a.player_id`)
	if err != nil {
		t.Fatal(err)
	}
	type acc struct {
		subject uuid.UUID
		login   string
	}
	var accs []acc
	for rows.Next() {
		var a acc
		if err := rows.Scan(&a.subject, &a.login); err != nil {
			t.Fatal(err)
		}
		accs = append(accs, a)
	}
	rows.Close()
	for _, a := range accs {
		if _, err := e.Store.InsertIdentity(e.Ctx, store.NewIdentity{
			ID: a.subject, Audience: store.AudiencePlayer, LoginKey: a.login, PasswordHash: "fake-hash-for-tests",
			PasswordScheme: store.SchemeArgon2id, Now: e.Clock.Now(),
		}); err != nil {
			t.Fatalf("insert player identity: %v", err)
		}
	}
}

// PlayerPass signs the player behind a subject in at the current fake time and returns the access pass. A subject with
// no identity gets no pass (the request goes out signed out).
func (e *Env) PlayerPass(t testing.TB, subject string) string {
	t.Helper()
	id := uuid.MustParse(subject)
	ident, err := e.Store.GetIdentityByID(e.Ctx, id)
	if err != nil {
		return "" // no identity behind the subject: nothing to sign in with, the request is signed out
	}
	var player uuid.UUID
	if err := e.Pool.QueryRow(e.Ctx, `SELECT player_id FROM player_accounts WHERE auth_subject = $1`, id).Scan(&player); err != nil {
		t.Fatalf("player of %s: %v", subject, err)
	}
	iss, err := e.Service.Issue(e.Ctx, session.IssueInput{Identity: ident, AccountID: player, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	return iss.AccessPass
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
	hr.Host = appHosts[r.App]
	if hr.Host == "" {
		hr.Host = appHosts["admin"]
	}
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
// of its admins and players, then the scenario's statements. Replay does it before every case; a test of its own does the same.
func (e *Env) Reseed(t testing.TB, seed string, scenario []string) {
	t.Helper()
	e.Exec(t, seed)
	// The sign-in rate limits count per client address and hour: every case starts with a clean count.
	e.Exec(t, `DELETE FROM auth_rate_limits`)
	e.RelinkAdmins(t)
	if e.Players {
		e.RelinkPlayers(t)
	}
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
