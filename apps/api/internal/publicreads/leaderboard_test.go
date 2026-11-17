package publicreads_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
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

// server builds the full router (proxy guard included) with the public reads registered.
func server(d publicreads.Deps) http.Handler {
	if d.Logger == nil {
		d.Logger = quietLogger()
	}
	return httpapi.NewHandler(httpapi.Deps{
		Logger: d.Logger, Pinger: noPing{}, Readiness: httpapi.NewReadiness(), ProxySecret: secret,
	}, publicreads.Register(d))
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

type casesFile struct {
	Approved  []string            `json:"approved"`
	Reset     []string            `json:"reset"`
	Scenarios map[string][]string `json:"scenarios"`
	Cases     []struct {
		Name     string `json:"name"`
		Scenario string `json:"scenario"`
		Approved bool   `json:"approved"`
		Path     string `json:"path"`
	} `json:"cases"`
}

type goldenCase struct {
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers"`
	Body    json.RawMessage   `json:"body"`
}

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

// openSeeded makes a database with the Prisma migrations and the leaderboard fixture rows.
func openSeeded(t *testing.T) *db.Pool { return openSeededWith(t, "leaderboard.seed.sql") }

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

// knownDeviations are inputs where the Go answer differs from the captured TypeScript one on purpose;
// the test pins the Go answer instead. Each is listed in the track's report to the owner.
var knownDeviations = map[string]string{
	// Prisma turns skip = 2^53 into 0 and returns the first page; every other huge offset below 2^63 is an empty page.
	"page_offset_2_pow_53": "empty page",
}

func TestLeaderboardMatchesRouteHandlers(t *testing.T) {
	var cases casesFile
	readTestdata(t, "leaderboard.cases.json", &cases)
	golden := map[string]goldenCase{}
	readTestdata(t, "leaderboard.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-leaderboard.test.mjs", len(golden), len(cases.Cases))
	}

	pool := openSeeded(t)
	limiter := httpapi.NewRateLimiter(1_000_000, nil) // the limit has its own tests
	closed := server(publicreads.Deps{Pool: pool.Raw(), Limiter: limiter})
	open := server(publicreads.Deps{Pool: pool.Raw(), Limiter: limiter, ApprovedAlgorithms: cases.Approved})
	ctx := context.Background()

	for i, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			for _, stmt := range append(append([]string{}, cases.Reset...), cases.Scenarios[c.Scenario]...) {
				if _, err := pool.Raw().Exec(ctx, stmt); err != nil {
					t.Fatalf("%s: %v", stmt, err)
				}
			}
			h := closed
			if c.Approved {
				h = open
			}
			rec := get(h, c.Path, fmt.Sprintf("198.51.100.%d", 1+i%250))
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			if dev, isDev := knownDeviations[c.Name]; isDev {
				if dev != "empty page" || rec.Code != 200 {
					t.Fatalf("deviation %q: status %d", dev, rec.Code)
				}
				var body struct {
					Entries []any `json:"entries"`
					Total   int   `json:"total"`
				}
				if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || len(body.Entries) != 0 || body.Total == 0 {
					t.Fatalf("want an empty page with the total, got %s", rec.Body.String())
				}
				return
			}
			if rec.Code != want.Status {
				t.Errorf("status %d, want %d (%s)", rec.Code, want.Status, rec.Body.String())
			}
			got := map[string]string{}
			for k := range rec.Header() {
				if strings.EqualFold(k, httpapi.RequestIDHeader) {
					continue // the Go server adds a request id; the Route Handler does not
				}
				got[strings.ToLower(k)] = rec.Header().Get(k)
			}
			if !reflect.DeepEqual(got, want.Headers) {
				t.Errorf("headers %v, want %v", got, want.Headers)
			}
			if !reflect.DeepEqual(decode(t, rec.Body.Bytes()), decode(t, want.Body)) {
				t.Errorf("body\n got %s\nwant %s", rec.Body.Bytes(), want.Body)
			}
		})
	}
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
	h := server(publicreads.Deps{Pool: pool.Raw(), Logger: log, ApprovedAlgorithms: []string{"rank-test-v1"}})
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

func TestClosedGateNeverTouchesTheDatabase(t *testing.T) {
	// Pool nil: any query would panic. With no approved algorithm (#247) every read is the empty state.
	h := server(publicreads.Deps{})
	for p, want := range map[string]string{
		"/api/leaderboard":                  `{"entries":[],"total":0}`,
		"/api/leaderboard?offset=3&limit=2": `{"entries":[],"total":0}`,
		"/api/leaderboard/search?q=alice":   `{"hits":[],"total":0}`,
	} {
		rec := get(h, p, "198.51.100.1")
		if rec.Code != 200 || rec.Body.String() != want {
			t.Errorf("%s = %d %s, want 200 %s", p, rec.Code, rec.Body.String(), want)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=0, must-revalidate" {
			t.Errorf("%s Cache-Control %q", p, cc)
		}
	}
}
