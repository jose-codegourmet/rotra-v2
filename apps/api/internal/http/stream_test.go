package httpapi

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *fakeClock) Now() time.Time { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	c.t = c.t.Add(d)
	c.mu.Unlock()
}

func streamDeps(clock *fakeClock) Deps {
	d := secretDeps()
	d.AllowedOrigins = []string{"https://queue.rotra.club", "http://localhost:9000"}
	d.Stream = StreamOptions{TicketTTL: 60 * time.Second, Heartbeat: 20 * time.Millisecond, TicketsPerMinute: 60}
	if clock != nil {
		d.Stream.Now = clock.Now
	}
	return d
}

func issue(t *testing.T, h http.Handler, hdr map[string]string) string {
	t.Helper()
	rec := do(h, "POST", "/api/stream/ticket", hdr)
	if rec.Code != 200 {
		t.Fatalf("issue: %d %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Ticket    string `json:"ticket"`
		ExpiresIn int    `json:"expiresInSeconds"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Ticket == "" {
		t.Fatalf("bad body %s", rec.Body.String())
	}
	if body.ExpiresIn != 60 {
		t.Errorf("expiresInSeconds %d", body.ExpiresIn)
	}
	if rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Error("ticket response must not be cached")
	}
	return body.Ticket
}

func TestTicketsAreRandomAndUnique(t *testing.T) {
	h := NewHandler(streamDeps(nil))
	a, b := issue(t, h, nil), issue(t, h, nil)
	if a == b || len(a) < 32 {
		t.Fatalf("weak tickets %q %q", a, b)
	}
}

func TestMissingForgedTicketRefusedNothingStreamed(t *testing.T) {
	h := NewHandler(streamDeps(nil))
	for _, q := range []string{"/stream", "/stream?ticket=", "/stream?ticket=forged", "/stream?ticket=" + strings.Repeat("a", 64)} {
		rec := do(h, "GET", q, nil)
		if rec.Code != 401 && rec.Code != 403 {
			t.Errorf("%s = %d", q, rec.Code)
		}
		if strings.Contains(rec.Header().Get("Content-Type"), "event-stream") || strings.Contains(rec.Body.String(), ": connected") {
			t.Errorf("%s streamed something: %q", q, rec.Body.String())
		}
	}
}

func TestExpiredTicketRefused(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	h := NewHandler(streamDeps(clock))
	tk := issue(t, h, nil)
	clock.Advance(61 * time.Second)
	if rec := do(h, "GET", "/stream?ticket="+tk, nil); rec.Code != 401 {
		t.Fatalf("expired ticket = %d", rec.Code)
	}
}

func TestTicketIsSingleUse(t *testing.T) {
	srv := httptest.NewServer(NewHandler(streamDeps(nil)))
	defer srv.Close()
	tk := issueOver(t, srv.URL)
	first := openStream(t, srv.URL, tk)
	defer first.Body.Close()
	if first.StatusCode != 200 || !strings.HasPrefix(first.Header.Get("Content-Type"), "text/event-stream") {
		t.Fatalf("first use: %d %s", first.StatusCode, first.Header.Get("Content-Type"))
	}
	second := openStream(t, srv.URL, tk)
	defer second.Body.Close()
	if second.StatusCode != 401 {
		t.Fatalf("second use = %d", second.StatusCode)
	}
}

func issueOver(t *testing.T, base string) string {
	t.Helper()
	resp, err := http.Post(base+"/api/stream/ticket", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var body struct{ Ticket string }
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	return body.Ticket
}

func openStream(t *testing.T, base, ticket string) *http.Response {
	t.Helper()
	resp, err := http.Get(base + "/stream?ticket=" + ticket)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func TestStreamStaysOpenAndHeartbeats(t *testing.T) {
	srv := httptest.NewServer(NewHandler(streamDeps(nil)))
	defer srv.Close()
	resp := openStream(t, srv.URL, issueOver(t, srv.URL))
	defer resp.Body.Close()
	if resp.Header.Get("Cache-Control") != "no-store" {
		t.Errorf("cache-control %q", resp.Header.Get("Cache-Control"))
	}
	sc := bufio.NewScanner(resp.Body)
	beats := 0
	deadline := time.AfterFunc(5*time.Second, func() { resp.Body.Close() })
	defer deadline.Stop()
	for sc.Scan() && beats < 3 {
		if strings.HasPrefix(sc.Text(), ": ") {
			beats++
		}
	}
	if beats < 3 {
		t.Fatalf("only %d heartbeat comments", beats)
	}
}

func TestStreamEndsWhenClientDisconnects(t *testing.T) {
	done := make(chan struct{})
	d := streamDeps(nil)
	d.Stream.onStreamEnd = func() { close(done) }
	srv := httptest.NewServer(NewHandler(d))
	defer srv.Close()
	ctx, cancel := context.WithCancel(context.Background())
	req, _ := http.NewRequestWithContext(ctx, "GET", srv.URL+"/stream?ticket="+issueOver(t, srv.URL), nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	cancel()
	resp.Body.Close()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("handler kept running after the client left")
	}
}

func TestStreamEndsOnServerDraining(t *testing.T) {
	d := streamDeps(nil)
	d.Readiness = NewReadiness()
	done := make(chan struct{})
	d.Stream.onStreamEnd = func() { close(done) }
	srv := httptest.NewServer(NewHandler(d))
	defer srv.Close()
	resp := openStream(t, srv.URL, issueOver(t, srv.URL))
	defer resp.Body.Close()
	d.Readiness.SetDraining()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("stream outlived shutdown")
	}
}

func TestReadinessDoneIsClosedOnDrainingAndSafeOnZeroValue(t *testing.T) {
	var zero Readiness
	zero.SetDraining()
	select {
	case <-zero.Done():
	default:
		t.Fatal("zero-value Done not closed after SetDraining")
	}
	r := NewReadiness()
	select {
	case <-r.Done():
		t.Fatal("closed too early")
	default:
	}
	r.SetDraining()
	r.SetDraining()
	<-r.Done()
}

func TestTicketRateLimitPerTrustedIP(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	d := streamDeps(clock)
	d.Stream.TicketsPerMinute = 3
	h := NewHandler(d)
	for i := 0; i < 3; i++ {
		issue(t, h, nil)
	}
	rec := do(h, "POST", "/api/stream/ticket", nil)
	if rec.Code != 429 || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("4th ticket = %d", rec.Code)
	}
	// another IP, same moment: separate budget (trusted forwarded IP)
	hdr := map[string]string{ProxySecretHeader: testSecret, "X-Forwarded-For": "198.51.100.1"}
	issue(t, h, hdr)
	// a faked XFF without the secret does not buy a new budget
	if rec := do(h, "POST", "/api/stream/ticket", map[string]string{"X-Forwarded-For": "9.9.9.9"}); rec.Code != 429 {
		t.Fatalf("spoofed ip got a budget: %d", rec.Code)
	}
	clock.Advance(61 * time.Second)
	issue(t, h, nil)
}

func TestUnusedTicketsArePruned(t *testing.T) {
	clock := &fakeClock{t: time.Now()}
	d := streamDeps(clock)
	d.Stream.TicketsPerMinute = 1000
	st := newTicketStore(d.Stream.withDefaults())
	for i := 0; i < 5; i++ {
		st.issue("1.1.1.1")
	}
	clock.Advance(2 * time.Minute)
	st.issue("1.1.1.1")
	if n := st.size(); n != 1 {
		t.Fatalf("store holds %d tickets, want 1", n)
	}
}

func TestStreamRouteMethods(t *testing.T) {
	h := NewHandler(streamDeps(nil))
	if rec := do(h, "GET", "/api/stream/ticket", nil); rec.Code != 405 && rec.Code != 404 {
		t.Fatalf("GET ticket = %d", rec.Code)
	}
	if rec := do(h, "POST", "/stream", nil); rec.Code != 405 && rec.Code != 404 {
		t.Fatalf("POST stream = %d", rec.Code)
	}
}

func TestDefaultsApplied(t *testing.T) {
	o := StreamOptions{}.withDefaults()
	if o.TicketTTL != 60*time.Second || o.Heartbeat != 20*time.Second || o.TicketsPerMinute != 60 || o.Now == nil {
		t.Fatalf("%+v", o)
	}
}

func TestCORS(t *testing.T) {
	h := NewHandler(streamDeps(nil))
	allowed := "https://queue.rotra.club"

	rec := do(h, "OPTIONS", "/stream", map[string]string{"Origin": allowed, "Access-Control-Request-Method": "GET"})
	if rec.Code != 204 || rec.Header().Get("Access-Control-Allow-Origin") != allowed || rec.Header().Get("Vary") == "" {
		t.Fatalf("preflight stream: %d %v", rec.Code, rec.Header())
	}
	rec = do(h, "OPTIONS", "/api/stream/ticket", map[string]string{"Origin": allowed, "Access-Control-Request-Method": "POST"})
	if rec.Code != 204 || rec.Header().Get("Access-Control-Allow-Origin") != allowed ||
		!strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), "POST") {
		t.Fatalf("preflight ticket: %d %v", rec.Code, rec.Header())
	}
	// real responses carry it too
	rec = do(h, "POST", "/api/stream/ticket", map[string]string{"Origin": allowed})
	if rec.Header().Get("Access-Control-Allow-Origin") != allowed {
		t.Error("ticket response lacks ACAO for an allowed origin")
	}
	rec = do(h, "GET", "/stream?ticket=bad", map[string]string{"Origin": allowed})
	if rec.Header().Get("Access-Control-Allow-Origin") != allowed {
		t.Error("stream refusal lacks ACAO, the browser could not read the 401")
	}

	for _, bad := range []string{"https://evil.example", "https://queue.rotra.club.evil.example", "http://queue.rotra.club", "null", "*"} {
		for _, req := range [][2]string{{"OPTIONS", "/stream"}, {"OPTIONS", "/api/stream/ticket"}, {"POST", "/api/stream/ticket"}, {"GET", "/stream?ticket=x"}} {
			rec := do(h, req[0], req[1], map[string]string{"Origin": bad, "Access-Control-Request-Method": "POST"})
			for k := range rec.Header() {
				if strings.HasPrefix(k, "Access-Control-") {
					t.Errorf("%s %s origin %q got %s", req[0], req[1], bad, k)
				}
			}
		}
	}
	// no Origin header (server to server): no CORS headers, ticket still works
	rec = do(h, "POST", "/api/stream/ticket", nil)
	if rec.Code != 200 || rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("headers added without an Origin")
	}
}

func TestNoCORSOnOtherRoutesEvenForAllowedOrigin(t *testing.T) {
	h := NewHandler(streamDeps(nil), ipEcho)
	for _, p := range []string{"/healthz", "/api/ip"} {
		rec := do(h, "GET", p, map[string]string{"Origin": "https://queue.rotra.club", ProxySecretHeader: testSecret})
		for k := range rec.Header() {
			if strings.HasPrefix(k, "Access-Control-") {
				t.Errorf("%s has %s", p, k)
			}
		}
	}
	rec := do(h, "OPTIONS", "/api/ip", map[string]string{"Origin": "https://queue.rotra.club", ProxySecretHeader: testSecret})
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("preflight answered on another route")
	}
}

func TestNoAllowedOriginsMeansNoCORS(t *testing.T) {
	d := streamDeps(nil)
	d.AllowedOrigins = nil
	h := NewHandler(d)
	rec := do(h, "POST", "/api/stream/ticket", map[string]string{"Origin": "https://queue.rotra.club"})
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("ACAO with an empty allowlist")
	}
}
