package google_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
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
	proxySecret = "test-proxy-secret"
	playerBase  = "https://player.test"
)

// base is a whole-second "now": Postgres keeps microseconds.
var base = time.Date(2026, 11, 23, 3, 0, 0, 0, time.UTC)

type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *fakeClock) Now() time.Time { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = c.t.Add(d)
}

// env serves the sign-in, claim and Google routes behind the real proxy guard, on a migrated throwaway database, with a fake
// Google. It proves the Go side of the flow; nothing here talks to the real Google.
type env struct {
	ctx     context.Context
	pool    *pgxpool.Pool
	st      *store.Store
	clk     *fakeClock
	svc     *session.Service
	google  *fakeGoogle
	handler http.Handler
	seq     atomic.Int64
}

func newEnv(t *testing.T, tune ...func(*config.AuthTuning)) *env {
	t.Helper()
	pool := testpg.NewMigratedPool(t, 24)
	e := &env{ctx: context.Background(), pool: pool, st: store.New(pool), clk: &fakeClock{t: base}, google: newFakeGoogle(t)}
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
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	tuning := config.DefaultAuthTuning()
	for _, f := range tune {
		f(&tuning)
	}
	e.svc, err = session.New(session.Deps{Store: e.st, Signer: signer, Verifier: verifier, Hasher: hasher, Tuning: tuning, SigningKey: key, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	signinRoutes, err := signin.Register(signin.Deps{Service: e.svc, Store: e.st, Verifier: verifier, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	claimRoutes, err := claim.Register(claim.Deps{Pool: pool, Service: e.svc, Store: e.st, ReadLimiter: httpapi.NewRateLimiter(1_000_000, nil), Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	h, err := google.New(google.Deps{Pool: pool, Service: e.svc, Store: e.st, Client: e.google.client(e.clk.Now), Sealer: google.NewSealer(key), RedirectBase: playerBase, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	e.handler = httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: httpapi.NewReadiness(), ProxySecret: proxySecret}, signinRoutes, claimRoutes, h.Routes())
	return e
}

// withoutClient is the same routes with Google not configured.
func (e *env) withoutClient(t *testing.T) http.Handler {
	t.Helper()
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	_, key, _ := ed25519.GenerateKey(rand.Reader)
	h, err := google.New(google.Deps{Pool: e.pool, Service: e.svc, Store: e.st, Sealer: google.NewSealer(key), RedirectBase: playerBase, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	return httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: e.pool, Readiness: httpapi.NewReadiness(), ProxySecret: proxySecret}, h.Routes())
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

func (e *env) flag(t testing.TB, on bool) {
	t.Helper()
	e.exec(t, `INSERT INTO feature_flags (key, name, description, value, updated_at) VALUES ('player_google_sign_in', 'Google sign-in', 'Test', $1, now())
	  ON CONFLICT (key) DO UPDATE SET value = $1`, on)
}

// browser is one visitor: it keeps the cookies the server sets, as a browser does (and drops the cleared ones).
type browser struct {
	e       *env
	cookies map[string]*http.Cookie
	ip      string
}

func (e *env) browser() *browser {
	n := e.seq.Add(1)
	return &browser{e: e, cookies: map[string]*http.Cookie{}, ip: "198.51.100." + itoa(int(n%250)+1)}
}

func itoa(n int) string { b, _ := json.Marshal(n); return string(b) }

type req struct {
	method, path string
	body         any
	noApp        bool
	noSecret     bool
}

func (b *browser) do(t testing.TB, r req) *httptest.ResponseRecorder {
	t.Helper()
	return b.doWith(t, b.e.handler, r)
}

func (b *browser) doWith(t testing.TB, h http.Handler, r req) *httptest.ResponseRecorder {
	t.Helper()
	var body io.Reader
	switch v := r.body.(type) {
	case nil:
	case string:
		body = bytes.NewReader([]byte(v))
	default:
		raw, err := json.Marshal(v)
		if err != nil {
			t.Fatal(err)
		}
		body = bytes.NewReader(raw)
	}
	hr := httptest.NewRequest(r.method, r.path, body)
	hr.Host = "player.test"
	if !r.noSecret {
		hr.Header.Set(httpapi.ProxySecretHeader, proxySecret)
	}
	if !r.noApp {
		hr.Header.Set("X-Rotra-App", "player")
	}
	hr.Header.Set("X-Real-IP", b.ip)
	for _, c := range b.cookies {
		hr.AddCookie(c)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, hr)
	for _, c := range w.Result().Cookies() {
		if c.MaxAge < 0 || c.Value == "" {
			delete(b.cookies, c.Name)
			continue
		}
		b.cookies[c.Name] = c
	}
	return w
}

func (b *browser) has(name string) bool { _, ok := b.cookies[name]; return ok }

// startFlow runs POST start and returns the state and nonce the browser would carry to Google.
func (b *browser) startFlow(t testing.TB, intent, key, returnTo string) (state, nonce string) {
	t.Helper()
	w := b.do(t, req{method: "POST", path: "/api/auth/google/start", body: map[string]string{"intent": intent, "key": key, "returnTo": returnTo}})
	if w.Code != http.StatusOK {
		t.Fatalf("start: %d %s", w.Code, w.Body.String())
	}
	var out struct{ URL string }
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	u, err := url.Parse(out.URL)
	if err != nil {
		t.Fatal(err)
	}
	return u.Query().Get("state"), u.Query().Get("nonce")
}

// trip runs the whole trip to Google and back for one account: start, Google answers with an ID token, callback. It returns the
// callback's response.
func (b *browser) trip(t testing.TB, intent, key, returnTo string, over claims) *httptest.ResponseRecorder {
	t.Helper()
	state, nonce := b.startFlow(t, intent, key, returnTo)
	code := "code-" + itoa(int(b.e.seq.Add(1)))
	b.e.google.grant(code, nonce, b.e.clk.Now(), over)
	return b.do(t, req{method: "GET", path: "/api/auth/google/callback?code=" + code + "&state=" + url.QueryEscape(state)})
}

type obj = map[string]any

func decode(t testing.TB, w *httptest.ResponseRecorder) obj {
	t.Helper()
	var v obj
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatalf("body is not a JSON object: %q (%v)", w.Body.String(), err)
	}
	return v
}

// --- seed data ---

type playerOpts struct {
	name     string
	email    string // the ROTRA email: the login and the contact
	google   string // google_email, "" for none
	disabled bool
	noHash   bool // a login made with Google: no password
}

// player adds a claimed player with a contact, a Player sign-in identity and an account.
func (e *env) player(t testing.TB, o playerOpts) (playerID, subject uuid.UUID) {
	t.Helper()
	if o.name == "" {
		o.name = "Pat Reyes"
	}
	playerID = uuid.New()
	e.exec(t, `INSERT INTO players (id, full_name, profile_state, updated_at) VALUES ($1, $2, 'claimed', now())`, playerID, o.name)
	n := e.seq.Add(1)
	e.exec(t, `INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`, playerID, "+639170"+pad(int(n), 6), o.email)
	hash := "x"
	if o.noHash {
		hash = ""
	}
	ident, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: o.email, PasswordHash: hash, PasswordScheme: store.SchemeArgon2id, Now: base})
	if err != nil {
		t.Fatal(err)
	}
	var google, disabled any
	if o.google != "" {
		google = o.google
	}
	if o.disabled {
		disabled = base
	}
	e.exec(t, `INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, disabled_at, updated_at)
	  VALUES ($1, 'rotra', $2, $3, 1, $4, $5, $6, now())`, playerID, ident.ID, base, google, nilIf(o.google != "", base), disabled)
	return playerID, ident.ID
}

func nilIf(ok bool, v time.Time) any {
	if ok {
		return v
	}
	return nil
}

func pad(n, width int) string {
	s := itoa(n)
	for len(s) < width {
		s = "0" + s
	}
	return s
}

// signIn gives the browser a real Player session for the account, as a password sign-in would.
func (b *browser) signIn(t testing.TB, subject, playerID uuid.UUID) {
	t.Helper()
	ident, err := b.e.st.GetIdentityByID(b.e.ctx, subject)
	if err != nil {
		t.Fatal(err)
	}
	issued, err := b.e.svc.Issue(b.e.ctx, session.IssueInput{Identity: ident, AccountID: playerID})
	if err != nil {
		t.Fatal(err)
	}
	b.cookies[session.AccessCookieName(store.AudiencePlayer)] = &http.Cookie{Name: session.AccessCookieName(store.AudiencePlayer), Value: issued.AccessPass}
	b.cookies[session.RefreshCookieName(store.AudiencePlayer)] = &http.Cookie{Name: session.RefreshCookieName(store.AudiencePlayer), Value: issued.RefreshPass}
}

func (e *env) googleEmailOf(t testing.TB, playerID uuid.UUID) *string {
	t.Helper()
	var got *string
	if err := e.pool.QueryRow(e.ctx, `SELECT google_email FROM player_accounts WHERE player_id = $1`, playerID).Scan(&got); err != nil {
		t.Fatal(err)
	}
	return got
}

// --- clubs and registration links ---

func (e *env) location(t testing.TB, country, city string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT id FROM location_codes WHERE country_code = $1 AND city_code = $2`, country, city).Scan(&id); err != nil {
		id = uuid.New()
		e.exec(t, `INSERT INTO location_codes (id, country_code, city_code, display_name, updated_at) VALUES ($1, $2, $3, $3, now())`, id, country, city)
	}
	return id
}

func (e *env) club(t testing.TB, name string) uuid.UUID {
	t.Helper()
	id := uuid.New()
	e.exec(t, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $3, $4, 'Somewhere', 'free', $5, now())`, id, name, name+id.String(), e.location(t, "PH", "CEB"), uuid.New())
	return id
}

type recordOpts struct {
	name  string
	phone string // the club's intake phone; "" for a guest with a name only
	email string
}

// recordLink adds a club's unclaimed record (a guest when it has no intake) and its invite link; it returns the token and the record.
func (e *env) recordLink(t testing.TB, club uuid.UUID, o recordOpts) (string, uuid.UUID) {
	t.Helper()
	if o.name == "" {
		o.name = "Gary Guest"
	}
	rec := uuid.New()
	e.exec(t, `INSERT INTO club_players (id, club_id, display_name, added_at, updated_at) VALUES ($1, $2, $3, $4, now())`, rec, club, o.name, base.Add(-48*time.Hour))
	if o.phone != "" || o.email != "" {
		var phone, email any
		if o.phone != "" {
			phone = o.phone
		}
		if o.email != "" {
			email = o.email
		}
		e.exec(t, `INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, email, captured_at, state, updated_at) VALUES ($1, $2, $3, $4, $5, 'pending', now())`, rec, club, phone, email, base.Add(-48*time.Hour))
	}
	token := "token-" + uuid.NewString()
	e.exec(t, `INSERT INTO club_player_claim_links (id, club_id, club_player_id, token_digest, state, issued_at, expires_at, updated_at) VALUES ($1, $2, $3, sha256($4::bytea), 'active', $5, $6, now())`,
		uuid.New(), club, rec, token, base.Add(-time.Hour), base.Add(7*24*time.Hour))
	return token, rec
}
