package publicreads_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

// GET /api/public-sessions/{slug}: the public session page, masked visitor view. Characterized against the real
// Queue Route Handler (testdata/tools/capture-publicsession.test.mjs). The page is cached ~10 s per slug and view,
// so the golden run moves a fake clock past the TTL before every case: each case then reads the database fresh,
// as the TypeScript (which has no cache) does, and the expiry itself is under test.

type sessionCasesFile struct {
	Reset     []string            `json:"reset"`
	Scenarios map[string][]string `json:"scenarios"`
	Cases     []struct {
		Name     string `json:"name"`
		Scenario string `json:"scenario"`
		Path     string `json:"path"`
	} `json:"cases"`
}

type sessionGolden struct {
	Status      int               `json:"status"`
	Headers     map[string]string `json:"headers"`
	Body        json.RawMessage   `json:"body"`
	RawContains []string          `json:"rawContains"`
}

const sessionTTL = 10 * time.Second

// mutate runs statements in one transaction with foreign keys off, like the seed (publication rows point at result
// snapshots the fixture does not have).
func mutate(t *testing.T, pool *pgxpool.Pool, stmts ...string) {
	t.Helper()
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, s := range append([]string{"SET LOCAL session_replication_role = replica"}, stmts...) {
		if _, err := tx.Exec(ctx, s); err != nil {
			t.Fatalf("%s: %v", s, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
}

// knownSessionDeviations are inputs where Go answers differently from the captured TypeScript on purpose.
// A slug with a NUL byte reaches Postgres in the TypeScript, which rejects it (a 500 that is logged as an error);
// no slug that fails the table's CHECK (^[a-z0-9-]{4,64}$) can exist, so Go answers not_found without a query.
var knownSessionDeviations = map[string]string{
	"slug_nul":        `{"error":{"code":"not_found","message":"Not found."}}`,
	"slug_nul_inside": `{"error":{"code":"not_found","message":"Not found."}}`,
}

// routerCleaned are paths the router rewrites before any handler runs: Go's ServeMux cleans ".." out of the path and
// redirects, as Next does at its own edge, so the TypeScript handler only saw it because the capture called it
// directly. No page can be reached or cached that way.
var routerCleaned = map[string]int{"slug_with_dot_dot": http.StatusTemporaryRedirect}

func TestPublicSessionMatchesTheRouteHandler(t *testing.T) {
	var cases sessionCasesFile
	readTestdata(t, "publicsession.cases.json", &cases)
	golden := map[string]sessionGolden{}
	readTestdata(t, "publicsession.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-publicsession.test.mjs", len(golden), len(cases.Cases))
	}
	pool := openSeededWith(t, "publicsession.seed.sql")
	clk := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	h := server(publicreads.Deps{Pool: pool.Raw(), Limiter: httpapi.NewRateLimiter(1_000_000, nil), Now: clk.Now})

	for i, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			mutate(t, pool.Raw(), append(append([]string{}, cases.Reset...), cases.Scenarios[c.Scenario]...)...)
			clk.Advance(sessionTTL) // the previous case's snapshot has expired
			rec := get(h, c.Path, fmt.Sprintf("198.51.100.%d", 1+i%250))
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			wantBody := compact(t, want.Body)
			if status, ok := routerCleaned[c.Name]; ok {
				if rec.Code != status || rec.Body.Len() > 200 {
					t.Errorf("%s = %d, want the router's %d", c.Name, rec.Code, status)
				}
				return
			}
			if dev, ok := knownSessionDeviations[c.Name]; ok {
				if rec.Code != http.StatusNotFound || rec.Body.String() != dev {
					t.Errorf("deviation %s = %d %s, want the pinned 404", c.Name, rec.Code, rec.Body.String())
				}
				return
			}
			if rec.Code != want.Status {
				t.Errorf("status %d, want %d (%.200s)", rec.Code, want.Status, rec.Body.String())
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
			// the same JSON, key for key, in the same order
			if !bytes.Equal(rec.Body.Bytes(), wantBody) {
				t.Errorf("body\n got %s\nwant %s", rec.Body.Bytes(), wantBody)
			}
			for _, raw := range want.RawContains {
				if !strings.Contains(rec.Body.String(), raw) {
					t.Errorf("the wire body must contain %s: %s", raw, rec.Body.String())
				}
			}
		})
	}
}

func compact(t *testing.T, raw []byte) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := json.Compact(&b, raw); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

// ---- counting what reaches the database ----

// queryCounter counts the page's main query: every database read of a page starts with it, so its count is the
// number of snapshots built.
type queryCounter struct{ n atomic.Int64 }

func (q *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, d pgx.TraceQueryStartData) context.Context {
	if strings.Contains(d.SQL, "name: GetPublicSessionBySlug") {
		q.n.Add(1)
	}
	return ctx
}
func (q *queryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}
func (q *queryCounter) count() int                                                      { return int(q.n.Load()) }

func openCounted(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	counter := &queryCounter{}
	cfg.ConnConfig.Tracer = counter
	cfg.MaxConns = 8
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	seed, err := os.ReadFile(filepath.Join("testdata", "publicsession.seed.sql"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), string(seed)); err != nil {
		t.Fatalf("seed: %v", err)
	}
	return pool, counter
}

func page(t *testing.T, h http.Handler, slug, ip string) map[string]any {
	t.Helper()
	rec := get(h, "/api/public-sessions/"+slug, ip)
	if rec.Code != http.StatusOK {
		t.Fatalf("%s = %d: %s", slug, rec.Code, rec.Body.String())
	}
	return decode(t, rec.Body.Bytes()).(map[string]any)
}

func TestManyClientsInOneWindowCostOneDatabaseRead(t *testing.T) {
	pool, reads := openCounted(t)
	clk := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	h := server(publicreads.Deps{Pool: pool, Now: clk.Now})
	burst := func() {
		var wg sync.WaitGroup
		bodies := make([]string, 100)
		for i := range bodies {
			wg.Add(1)
			go func() {
				defer wg.Done()
				rec := get(h, "/api/public-sessions/open-night", fmt.Sprintf("203.0.113.%d", i+1)) // 100 phones, 100 IPs
				if rec.Code != http.StatusOK {
					t.Errorf("client %d = %d", i, rec.Code)
				}
				bodies[i] = rec.Body.String()
			}()
		}
		wg.Wait()
		for i, b := range bodies {
			if b != bodies[0] {
				t.Fatalf("client %d got a different page", i)
			}
		}
	}
	burst()
	if got := reads.count(); got != 1 {
		t.Fatalf("%d database reads for 100 concurrent clients, want exactly 1", got)
	}
	clk.Advance(sessionTTL - time.Millisecond)
	burst()
	if got := reads.count(); got != 1 {
		t.Fatalf("%d database reads inside the window, want still 1", got)
	}
	clk.Advance(time.Millisecond) // the window ends: 100 clients refresh at once
	burst()
	if got := reads.count(); got != 2 {
		t.Fatalf("%d database reads after the window, want exactly one refresh (2 in all)", got)
	}
}

func TestEachSlugIsItsOwnSnapshot(t *testing.T) {
	pool, reads := openCounted(t)
	h := server(publicreads.Deps{Pool: pool})
	a := page(t, h, "open-night", "198.51.100.1")
	b := page(t, h, "active-night", "198.51.100.1")
	if a["title"] == b["title"] || reads.count() != 2 {
		t.Fatalf("titles %v %v after %d reads: two slugs are two snapshots", a["title"], b["title"], reads.count())
	}
	page(t, h, "open-night", "198.51.100.1")
	page(t, h, "active-night", "198.51.100.1")
	if reads.count() != 2 {
		t.Fatalf("%d reads, want the repeats served from the shared copies", reads.count())
	}
}

func TestTheCacheIsBoundedAndEvictsTheLeastRecentlyRead(t *testing.T) {
	pool, reads := openCounted(t)
	h := server(publicreads.Deps{Pool: pool, SnapshotMaxEntries: 2})
	for _, s := range []string{"open-night", "active-night", "finishing-up"} { // the third evicts the first
		page(t, h, s, "198.51.100.1")
	}
	if reads.count() != 3 {
		t.Fatalf("%d reads, want 3", reads.count())
	}
	page(t, h, "open-night", "198.51.100.1") // evicted: loads again (and evicts active-night)
	if reads.count() != 4 {
		t.Fatalf("%d reads, want the evicted slug to be read again", reads.count())
	}
	page(t, h, "finishing-up", "198.51.100.1") // still held
	if reads.count() != 4 {
		t.Fatalf("%d reads, want the recently read snapshot kept", reads.count())
	}
}

func TestUnknownSlugsAreNotCachedAndANewPageAppearsAtOnce(t *testing.T) {
	pool, reads := openCounted(t)
	h := server(publicreads.Deps{Pool: pool})
	for i := range 3 {
		if rec := get(h, "/api/public-sessions/brand-new-night", "198.51.100.1"); rec.Code != http.StatusNotFound {
			t.Fatalf("read %d = %d, want 404", i, rec.Code)
		}
	}
	if reads.count() != 3 {
		t.Fatalf("%d reads for 3 unknown-slug requests, want each to ask (a not_found is never stored)", reads.count())
	}
	mutate(t, pool, "UPDATE queue_sessions SET public_slug = 'brand-new-night' WHERE public_slug = 'empty-session'")
	if rec := get(h, "/api/public-sessions/brand-new-night", "198.51.100.1"); rec.Code != http.StatusOK {
		t.Fatalf("a page created a moment ago = %d, want 200 with no TTL wait", rec.Code)
	}
}

func TestSignInHeadersAndQueryCannotSelectAnotherView(t *testing.T) {
	pool, reads := openCounted(t)
	h := server(publicreads.Deps{Pool: pool})
	plain := get(h, "/api/public-sessions/open-night", "198.51.100.1")
	for _, tweak := range []func(*http.Request){
		func(r *http.Request) { r.Header.Set("Cookie", "sb-access-token=anything; rotra_player=1") },
		func(r *http.Request) { r.Header.Set("Authorization", "Bearer anything") },
		func(r *http.Request) { r.Header.Set("X-Rotra-View", "signed_in") },
		func(r *http.Request) { r.URL.RawQuery = "view=signed_in&viewer=d2000000-0000-4000-8000-000000000001" },
	} {
		req := httptest.NewRequest(http.MethodGet, "/api/public-sessions/open-night", nil)
		req.RemoteAddr = "10.0.0.1:5555"
		req.Header.Set(httpapi.ProxySecretHeader, secret)
		req.Header.Set("X-Real-IP", "198.51.100.1")
		tweak(req)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK || rec.Body.String() != plain.Body.String() {
			t.Fatalf("a signed-in looking request got a different answer: %d", rec.Code)
		}
	}
	if reads.count() != 1 {
		t.Fatalf("%d reads: the visitor snapshot is the only view Go serves, and it is shared", reads.count())
	}
}

// ---- results: never unpublished ----

func resultsOf(t *testing.T, h http.Handler, slug string) any {
	t.Helper()
	return page(t, h, slug, "198.51.100.1")["results"]
}

func TestResultsAreNullUnlessCompletedAndPublished(t *testing.T) {
	pool := openSeededWith(t, "publicsession.seed.sql")
	h := server(publicreads.Deps{Pool: pool.Raw(), Limiter: httpapi.NewRateLimiter(1_000_000, nil)})
	for slug, why := range map[string]string{
		"done-unpublished":      "completed, publication in state details",
		"done-no-row":           "completed, no publication row",
		"active-published-row":  "published row, but the session is still active",
		"later-published-night": "completed, details only so far",
		"open-night":            "prepared",
		"finishing-up":          "finalizing",
		"cancelled-night":       "cancelled",
		"invalid-night":         "invalid",
	} {
		rec := get(h, "/api/public-sessions/"+slug, "198.51.100.1")
		if rec.Code != http.StatusOK {
			t.Fatalf("%s = %d", slug, rec.Code)
		}
		body := decode(t, rec.Body.Bytes()).(map[string]any)
		if body["results"] != nil {
			t.Errorf("%s (%s): results %v, want null", slug, why, body["results"])
		}
		for _, leak := range []string{`"standings"`, `"awards"`, `"offDay"`, `"mvp"`} {
			if strings.Contains(rec.Body.String(), leak) {
				t.Errorf("%s (%s): the page carries %s", slug, why, leak)
			}
		}
	}
	for _, slug := range []string{"done-deleted-page", "ahead-deleted-page"} {
		if rec := get(h, "/api/public-sessions/"+slug, "198.51.100.1"); rec.Code != http.StatusNotFound || strings.Contains(rec.Body.String(), "Alice") {
			t.Errorf("%s = %d %s, want not_found", slug, rec.Code, rec.Body.String())
		}
	}
}

func TestACachedSnapshotNeverTurnsIntoPublishedResultsEarlyOrStaysAfterTheTTL(t *testing.T) {
	pool := openSeededWith(t, "publicsession.seed.sql")
	clk := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	h := server(publicreads.Deps{Pool: pool.Raw(), Now: clk.Now})

	// before publication: no results, and a publication inside the window is not served yet (the shared copy)
	if r := resultsOf(t, h, "later-published-night"); r != nil {
		t.Fatalf("results %v before publication", r)
	}
	mutate(t, pool.Raw(), `UPDATE session_publications SET state = 'published', published_snapshot_id = 'ec000000-0000-4000-8000-000000000008', published_slides = ARRAY['standings']::result_slide[], public_results = '{"standings":[{"position":1,"name":"Alice Reyes","wins":2,"losses":0,"games":2}]}'::jsonb, published_at = TIMESTAMPTZ '2026-11-08 00:00:00+00' WHERE session_id = 'e4000000-0000-4000-8000-000000000012'`)
	clk.Advance(sessionTTL - time.Millisecond)
	if r := resultsOf(t, h, "later-published-night"); r != nil {
		t.Fatalf("results %v inside the window: the snapshot taken before publication is the shared copy", r)
	}
	// after the window: published, and equal to what the TypeScript reads
	clk.Advance(time.Millisecond)
	r, _ := resultsOf(t, h, "later-published-night").(map[string]any)
	if r == nil || r["standings"] == nil {
		t.Fatalf("results %v after the window, want the published standings", r)
	}

	// and back: a snapshot taken while published is replaced after the window once the publication is gone
	mutate(t, pool.Raw(), `UPDATE session_publications SET state = 'deleted', deleted_at = TIMESTAMPTZ '2026-11-15 00:00:00+00', published_snapshot_id = NULL, published_at = NULL, published_slides = ARRAY[]::result_slide[], include_off_day = false, public_results = NULL WHERE session_id = 'e4000000-0000-4000-8000-000000000012'`)
	clk.Advance(sessionTTL - time.Millisecond)
	if r := resultsOf(t, h, "later-published-night"); r == nil {
		t.Fatal("inside the window the older copy is still the shared one (documented: a removal shows up within the TTL)")
	}
	clk.Advance(time.Millisecond)
	if rec := get(h, "/api/public-sessions/later-published-night", "198.51.100.1"); rec.Code != http.StatusNotFound {
		t.Fatalf("after the window a removed page = %d, want 404", rec.Code)
	}

	// unpublishing without deleting the page (back to details) clears the results after the window
	mutate(t, pool.Raw(), `UPDATE session_publications SET state = 'published', deleted_at = NULL, published_snapshot_id = 'ec000000-0000-4000-8000-000000000001', published_slides = ARRAY['standings']::result_slide[], public_results = '{"standings":[]}'::jsonb, published_at = TIMESTAMPTZ '2026-11-08 00:00:00+00' WHERE session_id = 'e4000000-0000-4000-8000-000000000012'`)
	clk.Advance(sessionTTL)
	if r := resultsOf(t, h, "later-published-night"); r == nil {
		t.Fatal("published again: results expected")
	}
	mutate(t, pool.Raw(), `UPDATE session_publications SET state = 'details', published_snapshot_id = NULL, published_slides = ARRAY[]::result_slide[], public_results = NULL, published_at = NULL WHERE session_id = 'e4000000-0000-4000-8000-000000000012'`)
	clk.Advance(sessionTTL)
	if r := resultsOf(t, h, "later-published-night"); r != nil {
		t.Fatalf("results %v after the publication went back to details", r)
	}
}

// ---- masked: no full name outside the published results ----

func TestPageNamesAreMaskedEverywhereButThePublishedResults(t *testing.T) {
	pool := openSeededWith(t, "publicsession.seed.sql")
	h := server(publicreads.Deps{Pool: pool.Raw(), Limiter: httpapi.NewRateLimiter(1_000_000, nil)})
	var cases sessionCasesFile
	readTestdata(t, "publicsession.cases.json", &cases)
	seen := 0
	for _, c := range cases.Cases {
		if c.Scenario != "base" || !strings.HasPrefix(c.Name, "session_") {
			continue
		}
		rec := get(h, c.Path, "198.51.100.1")
		if rec.Code != http.StatusOK {
			continue
		}
		seen++
		body := decode(t, rec.Body.Bytes()).(map[string]any)
		for _, list := range []string{"participants", "waitlist"} {
			for _, e := range body[list].([]any) {
				name := e.(map[string]any)["name"].(string)
				for _, word := range strings.Fields(name) {
					if word != "Player" && !strings.HasSuffix(word, "***") {
						t.Errorf("%s %s name %q is not masked", c.Name, list, name)
					}
				}
			}
		}
		for _, key := range []string{"phone", "email", "present", "cost", "payment", "presence", "inviteCode", "playerId"} {
			if strings.Contains(rec.Body.String(), `"`+key+`"`) {
				t.Errorf("%s: the page carries %q", c.Name, key)
			}
		}
	}
	if seen < 10 {
		t.Fatalf("only %d pages checked", seen)
	}
}

// ---- the route itself ----

func TestPublicSessionNeedsTheProxySecretAndServesOnlyGET(t *testing.T) {
	h := server(publicreads.Deps{})
	req := httptest.NewRequest(http.MethodGet, "/api/public-sessions/open-night", nil)
	for _, secretValue := range []string{"", "wrong"} {
		if secretValue != "" {
			req.Header.Set(httpapi.ProxySecretHeader, secretValue)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("secret %q = %d, want 404", secretValue, rec.Code)
		}
	}
	for _, m := range []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete} {
		r := httptest.NewRequest(m, "/api/public-sessions/open-night", nil)
		r.Header.Set(httpapi.ProxySecretHeader, secret)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		if rec.Code != http.StatusNotFound {
			t.Errorf("%s = %d, want the 404 envelope (this track serves GET only)", m, rec.Code)
		}
	}
	// the signed-in and request routes beside it are not served here
	for _, p := range []string{"/api/public-sessions/open-night/my-request", "/api/public-sessions/open-night/join-request"} {
		if rec := get(h, p, "198.51.100.1"); rec.Code != http.StatusNotFound {
			t.Errorf("%s = %d, want 404", p, rec.Code)
		}
	}
}

func TestMalformedSlugsAnswerNotFoundWithoutTheCacheOrTheDatabase(t *testing.T) {
	h := server(publicreads.Deps{}) // Pool nil: a query would panic
	want := `{"error":{"code":"not_found","message":"Not found."}}`
	for _, slug := range []string{
		"abc", "ABCD-EFGH", "Open-Night", "open_night", "open%20night", "open-night%20", "caf%C3%A9-night", "abc%E2%82%AC",
		strings.Repeat("x", 65), strings.Repeat("y", 300), "%00", "open%00night", "x%27%3B%20DROP%20TABLE%20queue_sessions%3B--",
		"open%25", "%ED%A0%80", "%FF%FE", "e4000000-0000-4000-8000-000000000001%2F..", "open%2Fnight", "%2e%2e%2e%2e", "a%0Ab-c",
	} {
		rec := get(h, "/api/public-sessions/"+slug, "198.51.100.1")
		if rec.Code != http.StatusNotFound || rec.Body.String() != want {
			t.Errorf("%q = %d %s, want 404 %s", slug, rec.Code, rec.Body.String(), want)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
			t.Errorf("%q Cache-Control %q", slug, cc)
		}
	}
}

func TestPublicSessionSharesTheOneLimiterAndALimitedRequestTouchesNothing(t *testing.T) {
	pool, reads := openCounted(t)
	clk := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	limiter := httpapi.NewRateLimiter(3, clk.Now)
	h := server(publicreads.Deps{Pool: pool, Limiter: limiter, Now: clk.Now})
	const ip = "203.0.113.90"
	// two other public reads and one page spend the same budget (no database for the malformed ones)
	get(h, "/api/players/x", ip)
	get(h, "/api/clubs/x", ip)
	if rec := get(h, "/api/public-sessions/open-night", ip); rec.Code != http.StatusOK {
		t.Fatalf("third request = %d, want served", rec.Code)
	}
	before := reads.count()
	for _, slug := range []string{"open-night", "active-night", "no-such-night", "abc"} {
		rec := get(h, "/api/public-sessions/"+slug, ip)
		if rec.Code != http.StatusTooManyRequests {
			t.Fatalf("%s = %d, want 429", slug, rec.Code)
		}
		if rec.Header().Get("Retry-After") == "" || rec.Header().Get("Cache-Control") != "private, no-store" {
			t.Errorf("%s: 429 headers %v", slug, rec.Header())
		}
	}
	if reads.count() != before {
		t.Fatalf("%d reads after the limit, was %d: a 429 must not reach the cache or the database", reads.count(), before)
	}
	// another trusted IP has its own budget, and a spoofed X-Forwarded-For buys nothing
	if rec := get(h, "/api/public-sessions/open-night", "203.0.113.91"); rec.Code != http.StatusOK {
		t.Fatalf("another IP = %d", rec.Code)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/public-sessions/open-night", nil)
	req.RemoteAddr = "10.0.0.1:1"
	req.Header.Set(httpapi.ProxySecretHeader, secret)
	req.Header.Set("X-Real-IP", ip)
	req.Header.Set("X-Forwarded-For", "192.0.2.200")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("same trusted IP, other X-Forwarded-For = %d, want 429", rec.Code)
	}
	// the same Limiter value: the page counts against the same per-IP window as every other public read
	clk.Advance(time.Minute)
	if rec := get(h, "/api/public-sessions/open-night", ip); rec.Code != http.StatusOK {
		t.Fatalf("new minute = %d", rec.Code)
	}
}

func TestDatabaseDownOnThePublicSessionPage(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := l.Addr().String()
	_ = l.Close()
	pool, err := db.Open(context.Background(), "postgres://u:secret-password@"+addr+"/x?sslmode=disable", db.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	var logs strings.Builder
	h := server(publicreads.Deps{Pool: pool.Raw(), Logger: slog.New(slog.NewTextHandler(&logs, nil))})
	for range 2 { // an error is not cached: the second request fails the same way, on its own
		rec := get(h, "/api/public-sessions/open-night", "198.51.100.1")
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status %d, want 500", rec.Code)
		}
		if want := `{"error":{"code":"internal","message":"Something went wrong."}}`; rec.Body.String() != want {
			t.Errorf("body %s", rec.Body.String())
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
			t.Errorf("Cache-Control %q: an error must never be cached", cc)
		}
	}
	if strings.Contains(logs.String(), "secret-password") {
		t.Fatal("the database password must never reach the log")
	}
}
