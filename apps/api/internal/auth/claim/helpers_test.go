package claim_test

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
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
	handler http.Handler
	seq     atomic.Int64
	ipSeq   atomic.Int64
}

type envOpts struct {
	readLimit int
	tuning    func(*config.AuthTuning)
}

// newEnv migrates a throwaway database and serves the claim and sign-in routes behind the real proxy guard.
func newEnv(t *testing.T, opts ...envOpts) *env {
	t.Helper()
	var o envOpts
	if len(opts) > 0 {
		o = opts[0]
	}
	if o.readLimit == 0 {
		o.readLimit = 1_000_000
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
	signinRoutes, err := signin.Register(signin.Deps{Service: e.svc, Store: e.st, Verifier: verifier, Clock: e.clk.Now, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	claimRoutes, err := claim.Register(claim.Deps{
		Pool: pool, Service: e.svc, Store: e.st, ReadLimiter: httpapi.NewRateLimiter(o.readLimit, nil), Clock: e.clk.Now, Logger: log,
	})
	if err != nil {
		t.Fatal(err)
	}
	e.handler = httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: httpapi.NewReadiness(), ProxySecret: secret}, signinRoutes, claimRoutes)
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
		ip = "198.51." + itoa(int(n/250)%250) + "." + itoa(int(n%250)+1)
	}
	hr.Header.Set("X-Real-IP", ip)
	for _, c := range r.cookies {
		hr.AddCookie(c)
	}
	w := httptest.NewRecorder()
	e.handler.ServeHTTP(w, hr)
	return w
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

func (e *env) get(token string, mut ...func(*req)) *httptest.ResponseRecorder {
	r := req{method: "GET", path: "/api/claim/" + token}
	for _, m := range mut {
		m(&r)
	}
	return e.do(r)
}

func (e *env) post(token, body string, mut ...func(*req)) *httptest.ResponseRecorder {
	r := req{method: "POST", path: "/api/claim/" + token, body: body}
	for _, m := range mut {
		m(&r)
	}
	return e.do(r)
}

func fromIP(ip string) func(*req) { return func(r *req) { r.ip = ip } }

// decode parses a JSON body into an any.
func decode(t testing.TB, w *httptest.ResponseRecorder) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatalf("body is not JSON: %q (%v)", w.Body.String(), err)
	}
	return v
}

// wantJSON compares a response body with an expected value, as decoded JSON.
func wantJSON(t testing.TB, w *httptest.ResponseRecorder, want any) {
	t.Helper()
	raw, err := json.Marshal(want)
	if err != nil {
		t.Fatal(err)
	}
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

type obj = map[string]any

// wantErr asserts the TypeScript error envelope: status, code, the code's fixed message and the fields.
func wantErr(t testing.TB, w *httptest.ResponseRecorder, status int, code string, fields map[string]string) {
	t.Helper()
	messages := map[string]string{
		"forbidden": "You do not have access to this.", "invalid": "Check the details and try again.",
		"conflict": "This changed since you loaded it. Refresh and try again.", "not_found": "Not found.",
		"unavailable": "This is not available right now.",
	}
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
}

func cookie(w *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func digestOf(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

func newToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// --- seed data ---

func (e *env) location(t testing.TB, country, city string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT id FROM location_codes WHERE country_code = $1 AND city_code = $2`, country, city).Scan(&id); err != nil {
		id = uuid.New()
		e.exec(t, `INSERT INTO location_codes (id, country_code, city_code, display_name, updated_at) VALUES ($1, $2, $3, $3, now())`, id, country, city)
	}
	return id
}

// club adds a club founded in PH/CEB (or the given city).
func (e *env) club(t testing.TB, name string, city ...string) uuid.UUID {
	t.Helper()
	c := "CEB"
	if len(city) > 0 {
		c = city[0]
	}
	id := uuid.New()
	e.exec(t, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $3, $4, 'Somewhere', 'free', $5, now())`, id, name, name+id.String(), e.location(t, "PH", c), uuid.New())
	return id
}

type recordOpts struct {
	name       string
	nickname   string
	phone      string // "" with input true: an intake without a phone
	email      string
	noInput    bool // no private input row at all
	inputState string
	state      string        // link state: active (default), consumed, revoked
	expires    time.Duration // from base; default +7 days
	removed    bool
	linkedTo   uuid.UUID // the record already joined this player
}

// recordLink adds a club's unclaimed record and its link; it returns the token and the record id.
func (e *env) recordLink(t testing.TB, club uuid.UUID, o recordOpts) (string, uuid.UUID) {
	t.Helper()
	if o.name == "" {
		o.name = "Ana Reyes"
	}
	if o.state == "" {
		o.state = "active"
	}
	if o.expires == 0 {
		o.expires = 7 * 24 * time.Hour
	}
	if o.inputState == "" {
		o.inputState = "pending"
	}
	rec := uuid.New()
	var nick, removed, linked any
	if o.nickname != "" {
		nick = o.nickname
	}
	if o.removed {
		removed = base
	}
	if o.linkedTo != uuid.Nil {
		linked = o.linkedTo
	}
	e.exec(t, `INSERT INTO club_players (id, club_id, player_id, display_name, nickname, added_at, removed_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
		rec, club, linked, o.name, nick, base.Add(-48*time.Hour), removed)
	if !o.noInput {
		var phone, email any
		if o.phone != "" {
			phone = o.phone
		}
		if o.email != "" {
			email = o.email
		}
		var resolvedBy, resolvedAt any
		if o.inputState == "resolved" || o.linkedTo != uuid.Nil {
			o.inputState = "resolved"
			resolvedBy, resolvedAt = o.linkedTo, base
		}
		e.exec(t, `INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, email, captured_at, state, resolved_player_id, resolved_at, updated_at)
		  VALUES ($1, $2, $3, $4, $5, $6::club_player_input_state, $7, $8, now())`, rec, club, phone, email, base.Add(-48*time.Hour), o.inputState, resolvedBy, resolvedAt)
	}
	token := newToken()
	var consumed, revoked any
	switch o.state {
	case "consumed":
		consumed = base.Add(-time.Hour)
	case "revoked":
		revoked = base.Add(-time.Hour)
	}
	e.exec(t, `INSERT INTO club_player_claim_links (id, club_id, club_player_id, token_digest, state, issued_at, expires_at, consumed_at, revoked_at, updated_at)
	  VALUES ($1, $2, $3, $4, $5::player_claim_link_state, $6, $7, $8, $9, now())`,
		uuid.New(), club, rec, digestOf(token), o.state, base.Add(-time.Hour), base.Add(o.expires), consumed, revoked)
	return token, rec
}

type playerOpts struct {
	name         string
	nickname     string
	phone        string // "" = no private contact at all
	email        string
	avatar       string
	style        string
	expMonths    *int32
	expRecorded  time.Time
	links        map[string]string
	state        string // link state
	expires      time.Duration
	noAllocation bool
	claimed      bool // profile_state claimed
	withAccount  bool
}

// playerLink adds an unclaimed player (a `players` row with a staged link); it returns the token and the player id.
func (e *env) playerLink(t testing.TB, club uuid.UUID, o playerOpts) (string, uuid.UUID) {
	t.Helper()
	if o.name == "" {
		o.name = "Ben Cruz"
	}
	if o.state == "" {
		o.state = "active"
	}
	if o.expires == 0 {
		o.expires = 7 * 24 * time.Hour
	}
	id := uuid.New()
	var nick, avatar, details, months, recorded any
	if o.nickname != "" {
		nick = o.nickname
	}
	if o.avatar != "" {
		avatar = o.avatar
	}
	version := any(nil)
	if o.style != "" {
		b, _ := json.Marshal(obj{"playingStyle": o.style})
		details, version = string(b), 1
	}
	if o.expMonths != nil {
		months, recorded = *o.expMonths, o.expRecorded
	}
	profile := "unclaimed"
	if o.claimed {
		profile = "claimed"
	}
	e.exec(t, `INSERT INTO players (id, full_name, nickname, avatar_ref, profile_state, personal_details, details_version, experience_months, experience_recorded_at, updated_at)
	  VALUES ($1, $2, $3, $4, $5::player_profile_state, $6::jsonb, $7, $8, $9, now())`, id, o.name, nick, avatar, profile, details, version, months, recorded)
	if o.phone != "" {
		var email any
		if o.email != "" {
			email = o.email
		}
		e.exec(t, `INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`, id, o.phone, email)
	}
	if !o.noAllocation {
		tx, err := e.pool.Begin(e.ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := identity.AllocateRTRID(e.ctx, tx, id, club, base.Add(-72*time.Hour)); err != nil {
			t.Fatal(err)
		}
		if err := tx.Commit(e.ctx); err != nil {
			t.Fatal(err)
		}
	}
	for provider, url := range o.links {
		e.exec(t, `INSERT INTO player_social_links (id, player_id, provider, url, updated_at) VALUES ($1, $2, $3::social_provider, $4, now())`, uuid.New(), id, provider, url)
	}
	if o.withAccount {
		ident, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: "staged-" + id.String() + "@example.test", PasswordHash: "x", PasswordScheme: store.SchemeArgon2id, Now: base})
		if err != nil {
			t.Fatal(err)
		}
		if o.phone == "" {
			t.Fatal("an account needs a contact")
		}
		e.exec(t, `UPDATE player_private_contacts SET email = $2 WHERE player_id = $1`, id, "staged-"+id.String()+"@example.test")
		e.exec(t, `INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at) VALUES ($1, 'rotra', $2, $3, 1, now())`, id, ident.ID, base)
	}
	token := newToken()
	var consumed, revoked any
	switch o.state {
	case "consumed":
		consumed = base.Add(-time.Hour)
	case "revoked":
		revoked = base.Add(-time.Hour)
	}
	e.exec(t, `INSERT INTO player_claim_links (id, player_id, issuing_club_id, token_digest, state, issued_at, expires_at, consumed_at, revoked_at, updated_at)
	  VALUES ($1, $2, $3, $4, $5::player_claim_link_state, $6, $7, $8, $9, now())`,
		uuid.New(), id, club, digestOf(token), o.state, base.Add(-time.Hour), base.Add(o.expires), consumed, revoked)
	return token, id
}

func i32(v int32) *int32 { return &v }

// claimBody builds a POST body; every field can be overridden.
func claimBody(over obj) string {
	b := obj{
		"email": "ana@example.com", "password": goodPass, "phone": "",
		"fullName": "Ana Reyes", "nickname": "", "playingStyle": "",
		"experienceYears": nil, "experienceMonths": nil,
		"socialLinks": obj{"facebook": "", "instagram": "", "youtube": "", "linkedin": ""},
	}
	for k, v := range over {
		b[k] = v
	}
	raw, _ := json.Marshal(b)
	return string(raw)
}

func storeNewIdentity(login string) store.NewIdentity {
	return store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: login, PasswordHash: "x", PasswordScheme: store.SchemeArgon2id, Now: base}
}

func claimBodyRaw(v obj) string {
	raw, _ := json.Marshal(v)
	return string(raw)
}

type claimDeps = claim.Deps

func claimRegister(e *env, mut func(*claimDeps)) (func(*http.ServeMux), error) {
	d := claimDeps{Pool: e.pool, Service: e.svc, Store: e.st, ReadLimiter: httpapi.NewRateLimiter(10, nil)}
	mut(&d)
	return claim.Register(d)
}
