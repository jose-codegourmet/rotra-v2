package recovery_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/signin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

const (
	secret   = "test-proxy-secret"
	goodPass = "correct horse battery staple"
	newPass  = "a brand new passphrase"
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
	ctx     context.Context
	pool    *pgxpool.Pool
	st      *store.Store
	clk     *fakeClock
	svc     *session.Service
	rec     *recovery.Recovery
	handler http.Handler
	seq     atomic.Int64
	ipSeq   atomic.Int64
	club    uuid.UUID
}

type envOpts struct {
	tuning func(*config.AuthTuning)
}

// newEnv migrates a throwaway database and serves the public recovery routes and the sign-in routes behind the
// real proxy guard.
func newEnv(t *testing.T, opts ...envOpts) *env {
	t.Helper()
	var o envOpts
	if len(opts) > 0 {
		o = opts[0]
	}
	pool := testpg.NewMigratedPool(t, 24)
	tuning := config.DefaultAuthTuning()
	if o.tuning != nil {
		o.tuning(&tuning)
	}
	e := &env{ctx: context.Background(), pool: pool, st: store.New(pool), clk: &fakeClock{t: base}}
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
	params := password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}
	hasher, err := password.NewHasher(params, 2)
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e.svc, err = session.New(session.Deps{
		Store: e.st, Signer: signer, Verifier: verifier, Hasher: hasher, Tuning: tuning, SigningKey: key,
		Clock: e.clk.Now, Logger: log,
	})
	if err != nil {
		t.Fatal(err)
	}
	e.rec, err = recovery.New(recovery.Deps{Pool: pool, Service: e.svc, Store: e.st, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	signinRoutes, err := signin.Register(signin.Deps{Service: e.svc, Store: e.st, Verifier: verifier, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	e.handler = httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: httpapi.NewReadiness(), ProxySecret: secret},
		signinRoutes, e.rec.Routes())
	e.club = e.newClub(t)
	return e
}

func (e *env) exec(t testing.TB, sql string, args ...any) {
	t.Helper()
	if _, err := e.pool.Exec(e.ctx, sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

func (e *env) count(t testing.TB, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := e.pool.QueryRow(e.ctx, sql, args...).Scan(&n); err != nil {
		t.Fatalf("count %q: %v", sql, err)
	}
	return n
}

// req is one request through the whole handler (proxy guard included).
type req struct {
	method, path string
	app          string // X-Rotra-App; "player" when empty unless noApp
	noApp        bool
	body         string
	noSecret     bool
	ip           string // X-Real-IP; a fresh address per request when empty
	cookies      []*http.Cookie
}

func (e *env) do(r req) *httptest.ResponseRecorder {
	var body io.Reader
	if r.body != "" {
		body = bytes.NewReader([]byte(r.body))
	}
	hr := httptest.NewRequest(r.method, r.path, body)
	hr.Host = "localhost:9001"
	if !r.noSecret {
		hr.Header.Set(httpapi.ProxySecretHeader, secret)
	}
	switch {
	case r.noApp:
	case r.app != "":
		hr.Header.Set("X-Rotra-App", r.app)
	default:
		hr.Header.Set("X-Rotra-App", "player")
	}
	ip := r.ip
	if ip == "" {
		n := e.ipSeq.Add(1)
		ip = "198.51." + strconv.Itoa(int(n/250)%250) + "." + strconv.Itoa(int(n%250)+1)
	}
	hr.Header.Set("X-Real-IP", ip)
	for _, c := range r.cookies {
		hr.AddCookie(c)
	}
	w := httptest.NewRecorder()
	e.handler.ServeHTTP(w, hr)
	return w
}

func (e *env) forgot(body string, mut ...func(*req)) *httptest.ResponseRecorder {
	r := req{method: "POST", path: "/api/auth/password-reset", body: body}
	for _, m := range mut {
		m(&r)
	}
	return e.do(r)
}

func (e *env) reset(body string, mut ...func(*req)) *httptest.ResponseRecorder {
	r := req{method: "POST", path: "/api/auth/reset-password", body: body}
	for _, m := range mut {
		m(&r)
	}
	return e.do(r)
}

func fromIP(ip string) func(*req) { return func(r *req) { r.ip = ip } }

func jsonBody(v any) string {
	raw, _ := json.Marshal(v)
	return string(raw)
}

type obj = map[string]any

func decode(t testing.TB, w *httptest.ResponseRecorder) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatalf("body is not JSON: %q (%v)", w.Body.String(), err)
	}
	return v
}

func wantJSON(t testing.TB, w *httptest.ResponseRecorder, want any) {
	t.Helper()
	raw, _ := json.Marshal(want)
	var wv any
	if err := json.Unmarshal(raw, &wv); err != nil {
		t.Fatal(err)
	}
	if got := decode(t, w); !reflect.DeepEqual(got, wv) {
		gb, _ := json.MarshalIndent(got, "", "  ")
		wb, _ := json.MarshalIndent(wv, "", "  ")
		t.Fatalf("status %d\ngot:\n%s\nwant:\n%s", w.Code, gb, wb)
	}
}

var messages = map[string]string{
	"forbidden": "You do not have access to this.", "invalid": "Check the details and try again.",
	"conflict": "This changed since you loaded it. Refresh and try again.", "not_found": "Not found.",
	"unavailable": "This is not available right now.",
}

// wantErr asserts the TypeScript error envelope: status, code, the code's fixed message and the fields.
func wantErr(t testing.TB, w *httptest.ResponseRecorder, status int, code string, fields map[string]string) {
	t.Helper()
	inner := obj{"code": code, "message": messages[code]}
	if fields != nil {
		inner["fields"] = fields
	}
	if w.Code != status {
		t.Fatalf("status %d, want %d (%s)", w.Code, status, w.Body.String())
	}
	wantJSON(t, w, obj{"error": inner})
	if got := w.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Errorf("Cache-Control %q", got)
	}
	if len(w.Result().Cookies()) != 0 {
		t.Error("a refusal must set no cookie")
	}
}

// wantServiceErr asserts a service error of the package's type.
func wantServiceErr(t testing.TB, err error, code httpapi.ErrorCode, fields map[string]string) {
	t.Helper()
	var re *recovery.Error
	if !errors.As(err, &re) {
		t.Fatalf("error %v is not a *recovery.Error", err)
	}
	if re.Code != code || !reflect.DeepEqual(re.Fields, fields) {
		t.Fatalf("error %s %v, want %s %v", re.Code, re.Fields, code, fields)
	}
}

// --- seed data ---

func (e *env) newClub(t testing.TB) uuid.UUID {
	t.Helper()
	var loc uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'`).Scan(&loc); err != nil {
		loc = uuid.New()
		e.exec(t, `INSERT INTO location_codes (id, country_code, city_code, display_name, updated_at) VALUES ($1, 'PH', 'CEB', 'CEB', now())`, loc)
	}
	id := uuid.New()
	e.exec(t, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, 'Test Club', $2, $3, 'Somewhere', 'free', $4, now())`, id, "club"+id.String(), loc, uuid.New())
	return id
}

// admin adds an active Admin account and returns its id.
func (e *env) admin(t testing.TB, name string) uuid.UUID {
	t.Helper()
	id := uuid.New()
	e.exec(t, `INSERT INTO admin_accounts (id, auth_provider, auth_subject, display_name, updated_at) VALUES ($1, 'rotra', $2, $3, now())`, id, uuid.New(), name)
	return id
}

type acctOpts struct {
	name           string
	email          string // contact email; "" = "player<n>@example.test"
	noContactEmail bool
	provider       string // auth_provider; default rotra
	disabled       bool   // player account disabled
	syncStatus     string // contact_sync_status; default in_sync
	noIdentity     bool   // the account's auth_subject points at no identity
	identityOff    bool   // the identity is disabled
	noRTR          bool
	noAccount      bool
}

type acct struct {
	player   uuid.UUID
	identity uuid.UUID
	email    string
}

// player adds a player with a private contact, an RTR ID, a sign-in identity (password goodPass) and the account.
func (e *env) player(t testing.TB, o acctOpts) acct {
	t.Helper()
	n := e.seq.Add(1)
	if o.name == "" {
		o.name = fmt.Sprintf("Player %d", n)
	}
	if o.email == "" {
		o.email = fmt.Sprintf("player%d@example.test", n)
	}
	if o.provider == "" {
		o.provider = "rotra"
	}
	if o.syncStatus == "" {
		o.syncStatus = "in_sync"
	}
	a := acct{player: uuid.New(), email: o.email}
	e.exec(t, `INSERT INTO players (id, full_name, profile_state, updated_at) VALUES ($1, $2, 'claimed', now())`, a.player, o.name)
	var email any = o.email
	if o.noContactEmail {
		email = nil
	}
	e.exec(t, `INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`,
		a.player, fmt.Sprintf("+63917%07d", n), email)
	if !o.noRTR {
		tx, err := e.pool.Begin(e.ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := identity.AllocateRTRID(e.ctx, tx, a.player, e.club, base.Add(-72*time.Hour)); err != nil {
			t.Fatal(err)
		}
		if err := tx.Commit(e.ctx); err != nil {
			t.Fatal(err)
		}
	}
	if o.noAccount {
		return a
	}
	subject := uuid.New()
	if o.provider == "rotra" && !o.noIdentity {
		hash, err := e.svc.Hasher().Hash(e.ctx, goodPass)
		if err != nil {
			t.Fatal(err)
		}
		ident, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: o.email, PasswordHash: hash, PasswordScheme: store.SchemeArgon2id, Now: base})
		if err != nil {
			t.Fatal(err)
		}
		subject, a.identity = ident.ID, ident.ID
		if o.identityOff {
			e.exec(t, `UPDATE auth_identities SET disabled_at = $2 WHERE id = $1`, ident.ID, base)
		}
	}
	var disabled any
	if o.disabled {
		disabled = base
	}
	e.exec(t, `INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, contact_sync_status, disabled_at, updated_at)
	  VALUES ($1, $2, $3, $4, 1, $5::player_contact_sync_status, $6, now())`, a.player, o.provider, subject, base, o.syncStatus, disabled)
	return a
}

// request is one player_password_reset_requests row as the tests read it.
type request struct {
	id         uuid.UUID
	email      string
	playerID   *uuid.UUID
	status     string
	reviewedBy *uuid.UUID
	reviewedAt *time.Time
	subject    *uuid.UUID
	digest     []byte
	consumedAt *time.Time
	revision   int64
	issuance   *uuid.UUID
	issuanceAt *time.Time
}

func (e *env) request(t testing.TB, id uuid.UUID) request {
	t.Helper()
	var r request
	err := e.pool.QueryRow(e.ctx, `SELECT id, email, player_id, status::text, reviewed_by_admin_id, reviewed_at, auth_subject, token_digest,
	  consumed_at, revision, issuance_id, issuance_started_at FROM player_password_reset_requests WHERE id = $1`, id).
		Scan(&r.id, &r.email, &r.playerID, &r.status, &r.reviewedBy, &r.reviewedAt, &r.subject, &r.digest, &r.consumedAt, &r.revision, &r.issuance, &r.issuanceAt)
	if err != nil {
		t.Fatalf("reading request %s: %v", id, err)
	}
	return r
}

// requestFor returns the id of the only request of an email, or fails.
func (e *env) requestFor(t testing.TB, email string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT id FROM player_password_reset_requests WHERE email = $1 ORDER BY requested_at DESC, id DESC LIMIT 1`, email).Scan(&id); err != nil {
		t.Fatalf("no request for %s: %v", email, err)
	}
	return id
}

// asked submits a request for the account's email and returns the request id.
func (e *env) asked(t testing.TB, a acct) uuid.UUID {
	t.Helper()
	if err := e.rec.Submit(e.ctx, a.email); err != nil {
		t.Fatal(err)
	}
	return e.requestFor(t, a.email)
}

// issued submits and issues a link; it returns the request id and the token.
func (e *env) issued(t testing.TB, admin uuid.UUID, a acct) (uuid.UUID, string) {
	t.Helper()
	id := e.asked(t, a)
	res, err := e.rec.Review(e.ctx, admin, id.String(), recovery.ReviewInput{Action: "issue", OwnershipVerified: true})
	if err != nil {
		t.Fatal(err)
	}
	if res.Token == nil {
		t.Fatal("issue returned no token")
	}
	return id, *res.Token
}

func (e *env) identityRow(t testing.TB, id uuid.UUID) store.Identity {
	t.Helper()
	ident, err := e.st.GetIdentityByID(e.ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	return ident
}
