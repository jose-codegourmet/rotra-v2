package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
	"time"
)

func TestRateLimiterAllowsTheLimitThenBlocks(t *testing.T) {
	clock := &fakeClock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	l := NewRateLimiter(300, clock.Now)
	for i := 1; i <= 300; i++ {
		if _, ok := l.Allow("203.0.113.1"); !ok {
			t.Fatalf("request %d blocked, the first 300 in a minute must pass", i)
		}
	}
	retry, ok := l.Allow("203.0.113.1")
	if ok {
		t.Fatal("301st request in the minute must be blocked")
	}
	if retry != 61 {
		t.Fatalf("retry-after %d, want 61 (60 s left in the window, rounded up as the ticket route does)", retry)
	}
	clock.Advance(40 * time.Second)
	if retry, ok := l.Allow("203.0.113.1"); ok || retry != 21 {
		t.Fatalf("still blocked 40 s in: ok=%v retry=%d, want blocked with 21", ok, retry)
	}
}

func TestRateLimiterKeepsKeysApart(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	l := NewRateLimiter(2, clock.Now)
	l.Allow("a")
	l.Allow("a")
	if _, ok := l.Allow("a"); ok {
		t.Fatal("a must be over its limit")
	}
	if _, ok := l.Allow("b"); !ok {
		t.Fatal("b has its own budget")
	}
}

func TestRateLimiterWindowResets(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	l := NewRateLimiter(1, clock.Now)
	l.Allow("a")
	if _, ok := l.Allow("a"); ok {
		t.Fatal("second request in the window must be blocked")
	}
	clock.Advance(59 * time.Second)
	if _, ok := l.Allow("a"); ok {
		t.Fatal("window is not over at 59 s")
	}
	clock.Advance(1 * time.Second)
	if _, ok := l.Allow("a"); !ok {
		t.Fatal("a new window opens after a minute")
	}
}

func TestRateLimiterForgetsIdleKeys(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	l := NewRateLimiter(5, clock.Now)
	for i := 0; i < 100; i++ {
		l.Allow("ip-" + strconv.Itoa(i))
	}
	clock.Advance(2 * time.Minute)
	l.Allow("fresh")
	if n := l.size(); n != 1 {
		t.Fatalf("limiter holds %d keys after every window ended, want 1", n)
	}
}

func TestRateLimiterDefaultsToTheRealClock(t *testing.T) {
	l := NewRateLimiter(1, nil)
	if _, ok := l.Allow("a"); !ok {
		t.Fatal("first request must pass")
	}
	if _, ok := l.Allow("a"); ok {
		t.Fatal("second request in the same minute must be blocked")
	}
}

func TestRateLimitMiddlewareAnswersWithTheStandardEnvelope(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	l := NewRateLimiter(2, clock.Now)
	var reached int
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		reached++
		WriteJSON(w, http.StatusOK, map[string]string{"ok": "yes"}, Public)
	})
	h := NewHandler(secretDeps(), func(m *http.ServeMux) {
		m.Handle("GET /api/limited", RateLimit(l, "Too many requests. Try again in a minute.", next))
	})
	hdr := map[string]string{ProxySecretHeader: testSecret, "X-Real-IP": "198.51.100.7"}
	for i := 0; i < 2; i++ {
		if rec := do(h, "GET", "/api/limited", hdr); rec.Code != 200 {
			t.Fatalf("request %d = %d", i+1, rec.Code)
		}
	}
	rec := do(h, "GET", "/api/limited", hdr)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("3rd request = %d, want 429", rec.Code)
	}
	if reached != 2 {
		t.Fatalf("handler reached %d times, a blocked request must not reach it", reached)
	}
	if got := rec.Header().Get("Retry-After"); got != "61" {
		t.Errorf("Retry-After %q, want 61", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Errorf("a 429 must never be cached, Cache-Control %q", got)
	}
	var body struct {
		Error struct{ Code, Message string } `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "rate_limited" || body.Error.Message != "Too many requests. Try again in a minute." {
		t.Fatalf("envelope %s", rec.Body.String())
	}
}

func TestRateLimitMiddlewareKeysOnTheTrustedIPOnly(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	l := NewRateLimiter(1, clock.Now)
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	h := NewHandler(secretDeps(), func(m *http.ServeMux) { m.Handle("GET /api/limited", RateLimit(l, "x", next)) })
	trusted := func(ip string) map[string]string {
		return map[string]string{ProxySecretHeader: testSecret, "X-Real-IP": ip}
	}
	if rec := do(h, "GET", "/api/limited", trusted("198.51.100.1")); rec.Code != 204 {
		t.Fatalf("first = %d", rec.Code)
	}
	if rec := do(h, "GET", "/api/limited", trusted("198.51.100.1")); rec.Code != 429 {
		t.Fatalf("same IP second = %d, want 429", rec.Code)
	}
	if rec := do(h, "GET", "/api/limited", trusted("198.51.100.2")); rec.Code != 204 {
		t.Fatalf("another IP = %d, want its own budget", rec.Code)
	}
	// Without the proxy secret the guard answers 404 before the limiter, so a forged header buys nothing and spends nothing.
	forged := map[string]string{"X-Real-IP": "198.51.100.9", "X-Forwarded-For": "198.51.100.9"}
	if rec := do(h, "GET", "/api/limited", forged); rec.Code != 404 {
		t.Fatalf("forged header without the secret = %d, want 404", rec.Code)
	}
	// A trusted request with no forwarded IP is keyed by the connection address.
	conn := map[string]string{ProxySecretHeader: testSecret}
	if rec := do(h, "GET", "/api/limited", conn); rec.Code != 204 {
		t.Fatalf("connection address first = %d", rec.Code)
	}
	if rec := do(h, "GET", "/api/limited", conn); rec.Code != 429 {
		t.Fatalf("connection address second = %d, want 429", rec.Code)
	}
}

func TestRateLimitMiddlewareIsOneBucketPerLimiter(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	l := NewRateLimiter(1, clock.Now)
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	h := NewHandler(secretDeps(), func(m *http.ServeMux) {
		m.Handle("GET /api/one", RateLimit(l, "x", next))
		m.Handle("GET /api/two", RateLimit(l, "x", next))
	})
	hdr := map[string]string{ProxySecretHeader: testSecret, "X-Real-IP": "198.51.100.1"}
	if rec := do(h, "GET", "/api/one", hdr); rec.Code != 204 {
		t.Fatalf("one = %d", rec.Code)
	}
	if rec := do(h, "GET", "/api/two", hdr); rec.Code != 429 {
		t.Fatalf("two = %d: routes sharing a limiter share the per-IP budget", rec.Code)
	}
}

// The regression suite resets its test clock to real time after a run that jumped hours ahead. A window
// opened on the jumped clock starts in the future, and must not keep blocking its key until real time catches up.
func TestRateLimiterWindowFromTheFutureIsOverWhenTimeGoesBack(t *testing.T) {
	clock := &fakeClock{t: time.Now().Add(3 * time.Hour)}
	l := NewRateLimiter(1, clock.Now)
	l.Allow("a")
	if _, ok := l.Allow("a"); ok {
		t.Fatal("second request in the window must be blocked")
	}
	clock.Advance(-3 * time.Hour)
	if _, ok := l.Allow("a"); !ok {
		t.Fatal("a window that starts after now is not a window we are in: a new one must open")
	}
}
