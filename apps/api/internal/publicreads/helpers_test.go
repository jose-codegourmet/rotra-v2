package publicreads_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

const secret = "test-proxy-secret"

type clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *clock) Now() time.Time { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *clock) Advance(d time.Duration) {
	c.mu.Lock()
	c.t = c.t.Add(d)
	c.mu.Unlock()
}

func quietLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

// server builds the full router (proxy guard included) with the public reads registered, and the reads that depend
// on the viewer as a server with no sign-in serves them: every caller is a visitor.
func server(d publicreads.Deps) http.Handler {
	if d.Logger == nil {
		d.Logger = quietLogger()
	}
	return httpapi.NewHandler(httpapi.Deps{
		Logger: d.Logger, Pinger: noPing{}, Readiness: httpapi.NewReadiness(), ProxySecret: secret,
	}, publicreads.Register(d), publicreads.RegisterVisitorOnly(d))
}

type noPing struct{}

func (noPing) Ping(context.Context) error { return nil }

func get(h http.Handler, path, ip string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.RemoteAddr = "10.0.0.1:5555"
	req.Header.Set(httpapi.ProxySecretHeader, secret)
	if ip != "" {
		req.Header.Set("X-Real-IP", ip)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func decode(t *testing.T, raw []byte) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("not JSON: %q: %v", raw, err)
	}
	return v
}

// ---- characterization against the TypeScript Route Handlers ----

func readTestdata(t *testing.T, name string, into any) {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, into); err != nil {
		t.Fatal(err)
	}
}

// openSeededWith makes a database with the Prisma migrations and the named fixture file from testdata.
func openSeededWith(t *testing.T, seedFile string) *db.Pool {
	t.Helper()
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	pool, err := db.Open(context.Background(), dsn, db.Options{MaxConns: 4})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	seed, err := os.ReadFile(filepath.Join("testdata", seedFile))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Raw().Exec(context.Background(), string(seed)); err != nil {
		t.Fatalf("seed: %v", err)
	}
	return pool
}

// ---- behavior that needs no fixture rows ----

func TestLeaderboardRoutesNeedTheProxySecret(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range []string{"/api/leaderboard", "/api/leaderboard?limit=2", "/api/leaderboard/search?q=a"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("%s without the proxy secret = %d, want 404", p, rec.Code)
		}
		req.Header.Set(httpapi.ProxySecretHeader, "wrong")
		rec = httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("%s with a wrong secret = %d, want 404", p, rec.Code)
		}
	}
}

func TestOnlyGETIsServed(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range []string{"/api/leaderboard", "/api/leaderboard/search"} {
		for _, m := range []string{http.MethodPost, http.MethodPut, http.MethodDelete} {
			req := httptest.NewRequest(m, p, nil)
			req.Header.Set(httpapi.ProxySecretHeader, secret)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != http.StatusNotFound {
				t.Errorf("%s %s = %d, want the 404 envelope", m, p, rec.Code)
			}
		}
	}
}

func TestPublicReadRateLimitIs300PerMinutePerTrustedIP(t *testing.T) {
	c := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	// No database: a blank search answers before any query, and a rejected page request never reaches one.
	h := server(publicreads.Deps{Limiter: httpapi.NewRateLimiter(httpapi.PublicReadsPerMinute, c.Now)})
	const ip = "203.0.113.50"
	for i := 1; i <= 300; i++ {
		path := "/api/leaderboard/search?q="
		if i%2 == 0 {
			path = "/api/leaderboard?limit=0" // 422, still a request
		}
		if rec := get(h, path, ip); rec.Code != http.StatusOK && rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("request %d = %d, want it served", i, rec.Code)
		}
	}
	rec := get(h, "/api/leaderboard/search?q=", ip)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("301st request = %d, want 429 (both routes share one budget)", rec.Code)
	}
	if rec.Header().Get("Retry-After") != "61" {
		t.Errorf("Retry-After %q", rec.Header().Get("Retry-After"))
	}
	var body struct {
		Error struct{ Code, Message string } `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil ||
		body.Error.Code != "rate_limited" || body.Error.Message != "Too many requests. Try again in a minute." {
		t.Fatalf("envelope %s", rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
		t.Errorf("a 429 must not be cached: %q", cc)
	}

	if rec := get(h, "/api/leaderboard/search?q=", "203.0.113.51"); rec.Code != http.StatusOK {
		t.Fatalf("another IP = %d, want its own budget", rec.Code)
	}
	if rec := get(h, "/api/leaderboard/search?q=", ip); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("still the same minute = %d", rec.Code)
	}
	c.Advance(time.Minute)
	if rec := get(h, "/api/leaderboard/search?q=", ip); rec.Code != http.StatusOK {
		t.Fatalf("new minute = %d, want served again", rec.Code)
	}
}

func TestRateLimitKeyIsTheProxyForwardedIPNotAHeaderAnyoneCanSet(t *testing.T) {
	c := &clock{t: time.Now()}
	h := server(publicreads.Deps{Limiter: httpapi.NewRateLimiter(1, c.Now)})
	if rec := get(h, "/api/leaderboard/search?q=", "198.51.100.1"); rec.Code != 200 {
		t.Fatalf("first = %d", rec.Code)
	}
	// Changing X-Forwarded-For while the trusted X-Real-IP stays the same must not buy a new budget.
	req := httptest.NewRequest(http.MethodGet, "/api/leaderboard/search?q=", nil)
	req.RemoteAddr = "10.0.0.1:1"
	req.Header.Set(httpapi.ProxySecretHeader, secret)
	req.Header.Set("X-Real-IP", "198.51.100.1")
	req.Header.Set("X-Forwarded-For", "192.0.2.77")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("same trusted IP with a different X-Forwarded-For = %d, want 429", rec.Code)
	}
}

func TestNilLimiterGetsTheDefaultLimit(t *testing.T) {
	h := server(publicreads.Deps{})
	for i := 0; i < httpapi.PublicReadsPerMinute; i++ {
		if rec := get(h, "/api/leaderboard/search?q=", "198.51.100.1"); rec.Code != 200 {
			t.Fatalf("request %d = %d", i+1, rec.Code)
		}
	}
	if rec := get(h, "/api/leaderboard/search?q=", "198.51.100.1"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("301st = %d", rec.Code)
	}
}

func TestDatabaseDownAnswersTheUnexpectedErrorBody(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := l.Addr().String()
	_ = l.Close() // nothing listens here now
	pool, err := db.Open(context.Background(), "postgres://u:secret-password@"+addr+"/x?sslmode=disable", db.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	var logs strings.Builder
	log := slog.New(slog.NewTextHandler(&logs, nil))
	h := server(publicreads.Deps{Pool: pool.Raw(), Logger: log})
	for _, p := range []string{"/api/leaderboard", "/api/leaderboard/search?q=alice"} {
		rec := get(h, p, "198.51.100.1")
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("%s = %d, want 500", p, rec.Code)
		}
		want := `{"error":{"code":"internal","message":"Something went wrong."}}`
		if rec.Body.String() != want {
			t.Errorf("%s body %s", p, rec.Body.String())
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
			t.Errorf("%s Cache-Control %q: an error must never be cached", p, cc)
		}
	}
	if strings.Contains(logs.String(), "secret-password") {
		t.Fatal("the database password must never reach the log")
	}
}
