package publicreads_test

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The public club page (no viewer), shown banners, shown characters, a character's image and the ranking settings.
// Characterized against the real Route Handlers: see testdata/tools/capture-clubpage.test.mjs. The club page is
// Queue's handler, which has no viewer: Player's variant reads a Player sign-in cookie and stays on its Route Handler
// until Go can verify a sign-in.

type clubCasesFile struct {
	Now       time.Time           `json:"now"`
	Reset     []string            `json:"reset"`
	Scenarios map[string][]string `json:"scenarios"`
	Images    []struct {
		ID      string `json:"id"`
		Image   string `json:"image"`
		Shown   bool   `json:"shown"`
		Deleted bool   `json:"deleted"`
		Number  int    `json:"number"`
	} `json:"images"`
	Cases []struct {
		Name     string `json:"name"`
		Scenario string `json:"scenario"`
		Path     string `json:"path"`
	} `json:"cases"`
}

type clubGoldenCase struct {
	Status      int               `json:"status"`
	Headers     map[string]string `json:"headers"`
	Body        json.RawMessage   `json:"body"`
	BodyBase64  *string           `json:"bodyBase64"`
	RawContains []string          `json:"rawContains"`
}

func TestClubPageAndLibraryMatchRouteHandlers(t *testing.T) {
	var cases clubCasesFile
	readTestdata(t, "clubpage.cases.json", &cases)
	golden := map[string]clubGoldenCase{}
	readTestdata(t, "clubpage.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-clubpage.test.mjs", len(golden), len(cases.Cases))
	}

	pool := openSeededWith(t, "clubpage.seed.sql")
	ctx := context.Background()
	for _, r := range cases.Images {
		_, err := pool.Raw().Exec(ctx, `INSERT INTO profile_characters (id, image, shown, uploaded_at, number, deleted_at)
			VALUES ($1, $2, $3, TIMESTAMPTZ '2026-11-12 00:00:00+00' + $4 * INTERVAL '1 millisecond', $5, CASE WHEN $6::boolean THEN TIMESTAMPTZ '2026-11-13 00:00:00+00' END)`,
			r.ID, r.Image, r.Shown, r.Number, r.Number, r.Deleted)
		if err != nil {
			t.Fatalf("image row %s: %v", r.ID, err)
		}
	}
	h := server(publicreads.Deps{
		Pool:    pool.Raw(),
		Limiter: httpapi.NewRateLimiter(1_000_000, nil), // the limit has its own tests
		Now:     func() time.Time { return cases.Now },
	})

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
				t.Errorf("status %d, want %d (%.200s)", rec.Code, want.Status, rec.Body.String())
			}
			got := map[string]string{}
			for k := range rec.Header() {
				if strings.EqualFold(k, httpapi.RequestIDHeader) {
					continue // the Go server adds a request id; the Route Handler does not
				}
				got[strings.ToLower(k)] = latin1ToString(rec.Header().Get(k)) // a header value is bytes; the golden is the JS string
			}
			if !reflect.DeepEqual(got, want.Headers) {
				t.Errorf("headers %v, want %v", got, want.Headers)
			}
			if want.BodyBase64 != nil {
				wantBytes, err := base64.StdEncoding.DecodeString(*want.BodyBase64)
				if err != nil {
					t.Fatal(err)
				}
				if !bytes.Equal(rec.Body.Bytes(), wantBytes) {
					t.Errorf("body %q, want %q", clip(rec.Body.Bytes()), clip(wantBytes))
				}
				return
			}
			gotBody, wantBody := decode(t, rec.Body.Bytes()), decode(t, want.Body)
			if strings.HasPrefix(c.Path, "/api/clubs/") {
				// With no viewer every name is masked, so members that share a masked name are not told apart by
				// anything but their order, and the TypeScript leaves that to the database. Go orders them by their
				// club player id (asserted in TestClubPageMembersWithTheSameNameAreOrderedByID); everything else,
				// including the order of the different names, must match.
				if g, w := memberNames(gotBody), memberNames(wantBody); !reflect.DeepEqual(g, w) {
					t.Errorf("member order\n got %q\nwant %q", g, w)
				}
				canonicalMembers(gotBody)
				canonicalMembers(wantBody)
			}
			if !reflect.DeepEqual(gotBody, wantBody) {
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

// latin1ToString reads header bytes the way a JavaScript Headers object does: one character per byte.
func latin1ToString(s string) string {
	r := make([]rune, len(s))
	for i := 0; i < len(s); i++ {
		r[i] = rune(s[i])
	}
	return string(r)
}

func clip(b []byte) []byte {
	if len(b) > 80 {
		return b[:80]
	}
	return b
}

func members(body any) []any {
	page, _ := body.(map[string]any)["page"].(map[string]any)
	m, _ := page["members"].([]any)
	return m
}

func memberNames(body any) []string {
	var out []string
	for _, m := range members(body) {
		out = append(out, m.(map[string]any)["name"].(string))
	}
	return out
}

// canonicalMembers puts members into (name, key) order, which is the same for every database order of ties.
func canonicalMembers(body any) {
	m := members(body)
	sort.SliceStable(m, func(i, j int) bool {
		a, b := m[i].(map[string]any), m[j].(map[string]any)
		if a["name"].(string) != b["name"].(string) {
			return a["name"].(string) < b["name"].(string)
		}
		return a["key"].(string) < b["key"].(string)
	})
}

// A masked member has no stable key (B-55): the key is only the place in the list, so the order of members that share
// a masked name (the TypeScript leaves it to the database) is not visible on the wire.
func TestClubPageMaskedMembersHaveOnlyPlaceKeysAndNoLevel(t *testing.T) {
	pool := openSeededWith(t, "clubpage.seed.sql")
	h := server(publicreads.Deps{Pool: pool.Raw(), Limiter: httpapi.NewRateLimiter(1_000_000, nil)})
	rec := get(h, "/api/clubs/a1000000-0000-4000-8000-000000000002", "198.51.100.1")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	var names, keys []string
	for i, m := range members(decode(t, rec.Body.Bytes())) {
		member := m.(map[string]any)
		names = append(names, member["name"].(string))
		keys = append(keys, member["key"].(string))
		if want := fmt.Sprintf("masked-%d", i); member["key"] != want {
			t.Errorf("member %d key %v, want %s", i, member["key"], want)
		}
		if member["level"] != nil {
			t.Errorf("member %d carries a level: %v", i, member["level"])
		}
	}
	// "j*** d***" (lower case first), then the four "J*** D***" members
	if want := []string{"j*** d***", "J*** D***", "J*** D***", "J*** D***", "J*** D***"}; !reflect.DeepEqual(names, want) {
		t.Errorf("member names %v, want %v (keys %v)", names, want, keys)
	}
}

// ---- behavior that needs no fixture rows ----

var clubRoutes = []string{
	"/api/clubs/a1000000-0000-4000-8000-000000000001",
	"/api/profile-banners/shown",
	"/api/profile-characters/shown",
	"/api/profile-characters/a/image",
	"/api/ranking-settings",
}

func TestClubPageAndLibraryRoutesNeedTheProxySecret(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range clubRoutes {
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

func TestClubPageAndLibraryRoutesServeOnlyGET(t *testing.T) {
	h := server(publicreads.Deps{})
	for _, p := range clubRoutes {
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

func TestClubPageAndLibraryRoutesShareTheOnePublicReadLimiter(t *testing.T) {
	c := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	limiter := httpapi.NewRateLimiter(5, c.Now)
	// No database: malformed ids answer before any query, and a limited request never reaches a handler.
	h := server(publicreads.Deps{Limiter: limiter})
	const ip = "203.0.113.70"
	for i, p := range []string{"/api/clubs/x", "/api/profile-characters/x/image", "/api/players/x", "/api/leaderboard/search?q=", "/api/clubs/y"} {
		if rec := get(h, p, ip); rec.Code == http.StatusTooManyRequests {
			t.Fatalf("request %d (%s) limited too early", i+1, p)
		}
	}
	for _, p := range clubRoutes {
		rec := get(h, p, ip)
		if rec.Code != http.StatusTooManyRequests {
			t.Fatalf("%s = %d, want 429 from the budget shared with the other public reads", p, rec.Code)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
			t.Errorf("a 429 must not be cached: %q", cc)
		}
		if rec.Header().Get("Retry-After") == "" {
			t.Errorf("%s: no Retry-After", p)
		}
	}
	if rec := get(h, "/api/clubs/x", "203.0.113.71"); rec.Code != http.StatusNotFound {
		t.Fatalf("another IP = %d, want its own budget", rec.Code)
	}
}

func TestMalformedClubAndCharacterIdsNeverTouchTheDatabase(t *testing.T) {
	h := server(publicreads.Deps{}) // Pool nil: a query would panic
	notFoundEnvelope := `{"error":{"code":"not_found","message":"Not found."}}`
	for p, want := range map[string]string{
		"/api/clubs/nope": notFoundEnvelope,
		"/api/clubs/a1000000-0000-4000-8000-0000000000010": notFoundEnvelope,
		"/api/clubs/%00": notFoundEnvelope,
	} {
		rec := get(h, p, "198.51.100.1")
		if rec.Code != http.StatusNotFound || rec.Body.String() != want {
			t.Errorf("%s = %d %s, want 404 %s", p, rec.Code, rec.Body.String(), want)
		}
	}
	for _, p := range []string{"/api/profile-characters/nope/image", "/api/profile-characters/A/image", "/api/profile-characters/ab/image", "/api/profile-characters/1/image", "/api/profile-characters/__/image"} {
		rec := get(h, p, "198.51.100.1")
		if rec.Code != http.StatusNotFound || rec.Body.Len() != 0 || rec.Header().Get("Cache-Control") != "no-store" {
			t.Errorf("%s = %d %q cache-control %q, want 404, no body, no-store", p, rec.Code, rec.Body.String(), rec.Header().Get("Cache-Control"))
		}
	}
}

func TestDatabaseDownOnTheClubPageAndLibraryRoutes(t *testing.T) {
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
	for _, p := range clubRoutes {
		rec := get(h, p, "198.51.100.1")
		if strings.HasSuffix(p, "/image") {
			// the image route has no error envelope: any failure is an empty 503 that is never cached
			if rec.Code != http.StatusServiceUnavailable || rec.Body.Len() != 0 || rec.Header().Get("Cache-Control") != "no-store" {
				t.Errorf("%s = %d %q cache-control %q, want an empty 503 no-store", p, rec.Code, rec.Body.String(), rec.Header().Get("Cache-Control"))
			}
			continue
		}
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
