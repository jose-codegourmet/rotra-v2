package publicreads_test

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The public player pages: GET /api/players/{playerId} (+ /rank, /games, /clubs) and GET /api/rtr-ids/{rtrId}.
// Characterized against the real Player Route Handlers: see testdata/tools/capture-playerpages.test.mjs.

const aliceID = "d1000000-0000-4000-8000-000000000001"

type playerCasesFile struct {
	Now       time.Time           `json:"now"`
	Reset     []string            `json:"reset"`
	Scenarios map[string][]string `json:"scenarios"`
	Cases     []struct {
		Name     string `json:"name"`
		Scenario string `json:"scenario"`
		Path     string `json:"path"`
	} `json:"cases"`
}

type playerGoldenCase struct {
	Status      int               `json:"status"`
	Headers     map[string]string `json:"headers"`
	Body        json.RawMessage   `json:"body"`
	RawContains []string          `json:"rawContains"`
}

func TestPlayerPagesMatchRouteHandlers(t *testing.T) {
	var cases playerCasesFile
	readTestdata(t, "playerpages.cases.json", &cases)
	golden := map[string]playerGoldenCase{}
	readTestdata(t, "playerpages.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-playerpages.test.mjs", len(golden), len(cases.Cases))
	}

	pool := openSeededWith(t, "playerpages.seed.sql")
	h := server(publicreads.Deps{
		Pool:    pool.Raw(),
		Limiter: httpapi.NewRateLimiter(1_000_000, nil), // the limit has its own tests
		Now:     func() time.Time { return cases.Now },
	})
	ctx := context.Background()

	for i, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			for _, stmt := range append(append([]string{}, cases.Reset...), cases.Scenarios[c.Scenario]...) {
				if _, err := pool.Raw().Exec(ctx, stmt); err != nil {
					t.Fatalf("%s: %v", stmt, err)
				}
			}
			rec := get(h, c.Path, fmt.Sprintf("198.51.100.%d", 1+i%250))
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
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
			for _, raw := range want.RawContains {
				if !strings.Contains(rec.Body.String(), raw) {
					t.Errorf("the wire body must contain %s: %s", raw, rec.Body.String())
				}
			}
		})
	}
}

// ---- behavior that needs no fixture rows ----

var playerRoutes = []string{
	"/api/players/" + aliceID,
	"/api/players/" + aliceID + "/rank",
	"/api/players/" + aliceID + "/games",
	"/api/players/" + aliceID + "/clubs",
	"/api/rtr-ids/RTR-PH-CEB-102926-0001",
}

func TestPlayerRoutesNeedTheProxySecret(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range playerRoutes {
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

func TestPlayerRoutesServeOnlyGET(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range playerRoutes {
		for _, m := range []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete} {
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

func TestSignedInPlayerRoutesAreNotServedHere(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range []string{"/api/players/" + aliceID + "/compare", "/api/rtr-ids/RTR-PH-CEB-102926-0001/stats", "/api/players/" + aliceID + "/other"} {
		if rec := get(h, p, "198.51.100.1"); rec.Code != http.StatusNotFound {
			t.Errorf("%s = %d, want 404: it is a signed-in route and stays in Next.js", p, rec.Code)
		}
	}
}

func TestPlayerRoutesShareTheOneLeaderboardLimiter(t *testing.T) {
	c := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	limiter := httpapi.NewRateLimiter(5, c.Now)
	// No database: malformed ids answer before any query, and a limited request never reaches a handler.
	h := server(publicreads.Deps{Limiter: limiter})
	const ip = "203.0.113.60"
	for i, p := range []string{"/api/players/x", "/api/players/x/rank", "/api/players/x/games", "/api/players/x/clubs", "/api/leaderboard/search?q="} {
		if rec := get(h, p, ip); rec.Code == http.StatusTooManyRequests {
			t.Fatalf("request %d (%s) limited too early", i+1, p)
		}
	}
	// the sixth request of the minute, on any of the five routes, is over the budget the leaderboard also spends
	for _, p := range playerRoutes {
		rec := get(h, p, ip)
		if rec.Code != http.StatusTooManyRequests {
			t.Fatalf("%s = %d, want 429 from the budget shared with the leaderboard", p, rec.Code)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
			t.Errorf("a 429 must not be cached: %q", cc)
		}
		if rec.Header().Get("Retry-After") == "" {
			t.Errorf("%s: no Retry-After", p)
		}
	}
	if rec := get(h, "/api/players/x", "203.0.113.61"); rec.Code != http.StatusNotFound {
		t.Fatalf("another IP = %d, want its own budget", rec.Code)
	}
}

func TestNonUUIDIdsNeverTouchTheDatabase(t *testing.T) {
	h := server(publicreads.Deps{}) // Pool nil: a query would panic
	for p, want := range map[string]struct {
		status int
		body   string
	}{
		"/api/players/nope":                  {404, `{"error":{"code":"not_found","message":"Not found."}}`},
		"/api/players/nope/clubs":            {404, `{"error":{"code":"not_found","message":"Not found."}}`},
		"/api/players/nope/rank":             {200, `{"rank":null}`},
		"/api/players/nope/games":            {200, `{"games":[]}`},
		"/api/players/%00/games":             {200, `{"games":[]}`},
		"/api/players/" + aliceID + "0/rank": {200, `{"rank":null}`},
	} {
		rec := get(h, p, "198.51.100.1")
		if rec.Code != want.status || rec.Body.String() != want.body {
			t.Errorf("%s = %d %s, want %d %s", p, rec.Code, rec.Body.String(), want.status, want.body)
		}
	}
}

func TestDatabaseDownAnswersTheUnexpectedErrorBodyOnThePlayerRoutes(t *testing.T) {
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
	h := server(publicreads.Deps{Pool: pool.Raw(), Logger: slog.New(slog.NewTextHandler(&logs, nil))})
	for _, p := range playerRoutes {
		rec := get(h, p, "198.51.100.1")
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("%s = %d, want 500", p, rec.Code)
		}
		if want := `{"error":{"code":"internal","message":"Something went wrong."}}`; rec.Body.String() != want {
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
