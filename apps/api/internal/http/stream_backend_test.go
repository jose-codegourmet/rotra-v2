package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeBackend stands in for the live-updates package: the transport is what is tested here.
type fakeBackend struct {
	mu        sync.Mutex
	identify  func(http.ResponseWriter, *http.Request) (any, bool, bool)
	grant     func(topics []string) (any, []string, error)
	openErr   error
	feed      *fakeFeed
	lastID    string
	opened    int
	grantedTo any
}

type fakeFeed struct {
	ch     chan StreamMessage
	closed chan struct{}
	once   sync.Once
}

func newFakeFeed() *fakeFeed {
	return &fakeFeed{ch: make(chan StreamMessage, 8), closed: make(chan struct{})}
}

func (f *fakeFeed) Messages() <-chan StreamMessage { return f.ch }
func (f *fakeFeed) Close()                         { f.once.Do(func() { close(f.closed) }) }

func (b *fakeBackend) Identify(w http.ResponseWriter, r *http.Request) (any, bool, bool) {
	if b.identify != nil {
		return b.identify(w, r)
	}
	return "visitor", false, true
}

func (b *fakeBackend) Grant(_ *http.Request, viewer any, topics []string) (any, []string, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.grantedTo = viewer
	if b.grant != nil {
		return b.grant(topics)
	}
	return "grant", topics, nil
}

func (b *fakeBackend) Open(_ *http.Request, grant any, last string) (StreamFeed, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.opened++
	b.lastID = last
	if b.openErr != nil {
		return nil, b.openErr
	}
	return b.feed, nil
}

type fakeMetrics struct {
	mu      sync.Mutex
	refused []string
	open    int
	opened  int
}

func (m *fakeMetrics) StreamRefused(r string) {
	m.mu.Lock()
	m.refused = append(m.refused, r)
	m.mu.Unlock()
}
func (m *fakeMetrics) StreamOpened() { m.mu.Lock(); m.open++; m.opened++; m.mu.Unlock() }
func (m *fakeMetrics) StreamClosed() { m.mu.Lock(); m.open--; m.mu.Unlock() }

func backendDeps(b *fakeBackend, m *fakeMetrics) Deps {
	d := streamDeps(nil)
	d.Stream.Backend = b
	if m != nil {
		d.Stream.Metrics = m
	}
	return d
}

func postTicket(h http.Handler, body string, hdr map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("POST", "/api/stream/ticket", strings.NewReader(body))
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestTicketReplyListsTheAcceptedTopicsAndNoBackendMeansNone(t *testing.T) {
	b := &fakeBackend{grant: func(topics []string) (any, []string, error) { return "g", topics[:1], nil }}
	h := NewHandler(backendDeps(b, nil))
	rec := postTicket(h, `{"topics":["a","b"]}`, nil)
	var reply struct {
		Ticket string   `json:"ticket"`
		Topics []string `json:"topics"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &reply); err != nil || rec.Code != 200 || len(reply.Topics) != 1 || reply.Topics[0] != "a" {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	// With no backend a ticket still comes, with an empty topic list.
	rec = postTicket(NewHandler(streamDeps(nil)), `{"topics":["a"]}`, nil)
	if !strings.Contains(rec.Body.String(), `"topics":[]`) {
		t.Fatalf("%s", rec.Body)
	}
}

func TestGrantErrorsAreAnsweredWithTheirCodeOrInternal(t *testing.T) {
	b := &fakeBackend{grant: func([]string) (any, []string, error) { return nil, nil, &StreamError{Code: ErrForbidden} }}
	h := NewHandler(backendDeps(b, nil))
	if rec := postTicket(h, `{"topics":["a"]}`, nil); rec.Code != 403 || !strings.Contains(rec.Body.String(), "forbidden") {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	b.grant = func([]string) (any, []string, error) { return nil, nil, errors.New("database down") }
	rec := postTicket(h, `{"topics":["a"]}`, nil)
	if rec.Code != 500 || strings.Contains(rec.Body.String(), "database down") {
		t.Fatalf("%d %s: details go to the log, not the wire", rec.Code, rec.Body)
	}
}

func TestIdentifyThatAnsweredStopsTheTicket(t *testing.T) {
	b := &fakeBackend{identify: func(w http.ResponseWriter, _ *http.Request) (any, bool, bool) {
		WriteError(w, ErrUnauthenticated, nil)
		return nil, false, false
	}}
	h := NewHandler(backendDeps(b, nil))
	if rec := postTicket(h, `{"topics":["a"]}`, nil); rec.Code != 401 {
		t.Fatalf("%d", rec.Code)
	}
	if b.grantedTo != nil {
		t.Fatal("Grant ran after Identify had answered")
	}
}

func TestSignedInViewersAreNeverCountedAgainstTheTicketLimit(t *testing.T) {
	b := &fakeBackend{identify: func(http.ResponseWriter, *http.Request) (any, bool, bool) { return "me", true, true }}
	d := backendDeps(b, nil)
	d.Stream.TicketsPerMinute = 2
	h := NewHandler(d)
	for i := 0; i < 10; i++ {
		if rec := postTicket(h, `{"topics":["a"]}`, nil); rec.Code != 200 {
			t.Fatalf("ticket %d = %d", i, rec.Code)
		}
	}
	b.identify = nil // a visitor
	for i := 0; i < 2; i++ {
		postTicket(h, `{"topics":["a"]}`, nil)
	}
	m := &fakeMetrics{}
	d.Stream.Metrics = m
	h = NewHandler(d)
	postTicket(h, `{}`, nil)
	postTicket(h, `{}`, nil)
	if rec := postTicket(h, `{}`, nil); rec.Code != 429 || len(m.refused) != 1 || m.refused[0] != "ticket_rate" {
		t.Fatalf("%d refusals %v", rec.Code, m.refused)
	}
}

func openOver(t *testing.T, base, ticket string, hdr map[string]string, query string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("GET", base+"/stream?ticket="+ticket+query, nil)
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func ticketOver(t *testing.T, base, body string) string {
	t.Helper()
	resp, err := http.Post(base+"/api/stream/ticket", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var out struct{ Ticket string }
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return out.Ticket
}

func TestStreamWritesTheFeedAsServerSentEventsAndPassesTheLastEventId(t *testing.T) {
	b := &fakeBackend{feed: newFakeFeed()}
	m := &fakeMetrics{}
	srv := httptest.NewServer(NewHandler(backendDeps(b, m)))
	defer srv.Close()

	resp := openOver(t, srv.URL, ticketOver(t, srv.URL, `{"topics":["a"]}`), map[string]string{"Last-Event-ID": "7:9"}, "")
	defer func() { _ = resp.Body.Close() }()
	b.feed.ch <- StreamMessage{ID: "7:10", Event: "changed", Data: []byte(`{"x":1}`)}
	buf := make([]byte, 256)
	var got strings.Builder
	deadline := time.Now().Add(3 * time.Second)
	for !strings.Contains(got.String(), "data: {\"x\":1}\n\n") && time.Now().Before(deadline) {
		n, _ := resp.Body.Read(buf)
		got.Write(buf[:n])
	}
	if !strings.Contains(got.String(), "id: 7:10\nevent: changed\ndata: {\"x\":1}\n\n") {
		t.Fatalf("stream = %q", got.String())
	}
	if b.lastID != "7:9" {
		t.Fatalf("last event id %q, want the header's", b.lastID)
	}
	m.mu.Lock()
	open := m.open
	m.mu.Unlock()
	if open != 1 {
		t.Fatalf("open streams %d", open)
	}

	// The query parameter does the same for a client that cannot set the header (a new EventSource after a ticket was used up).
	b2 := &fakeBackend{feed: newFakeFeed()}
	srv2 := httptest.NewServer(NewHandler(backendDeps(b2, nil)))
	defer srv2.Close()
	r2 := openOver(t, srv2.URL, ticketOver(t, srv2.URL, `{"topics":["a"]}`), nil, "&lastEventId=3:4")
	defer func() { _ = r2.Body.Close() }()
	if b2.lastID != "3:4" {
		t.Fatalf("last event id %q, want the query's", b2.lastID)
	}
}

func TestAFeedThatEndsOnItsOwnGetsTheReconnectHint(t *testing.T) {
	b := &fakeBackend{feed: newFakeFeed()}
	d := backendDeps(b, nil)
	d.Stream.ReconnectWait = func() time.Duration { return 1234 * time.Millisecond }
	srv := httptest.NewServer(NewHandler(d))
	defer srv.Close()
	resp := openOver(t, srv.URL, ticketOver(t, srv.URL, `{"topics":["a"]}`), nil, "")
	defer func() { _ = resp.Body.Close() }()
	close(b.feed.ch)
	var all bytes.Buffer
	buf := make([]byte, 512)
	for {
		n, err := resp.Body.Read(buf)
		all.Write(buf[:n])
		if err != nil {
			break
		}
	}
	if !strings.Contains(all.String(), "retry: 1234\nevent: reconnect\ndata: {\"retryMs\":1234}\n\n") {
		t.Fatalf("stream = %q", all.String())
	}
	select {
	case <-b.feed.closed:
	case <-time.After(2 * time.Second):
		t.Fatal("the feed was not closed when the stream ended")
	}
}

func TestOpenFailingAnswersUnavailable(t *testing.T) {
	b := &fakeBackend{openErr: errors.New("not ready")}
	srv := httptest.NewServer(NewHandler(backendDeps(b, nil)))
	defer srv.Close()
	resp := openOver(t, srv.URL, ticketOver(t, srv.URL, `{"topics":["a"]}`), nil, "")
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != 503 {
		t.Fatalf("%d", resp.StatusCode)
	}
}

func TestStreamCounterCapsPerIPAndInTotal(t *testing.T) {
	c := newStreamCounter(2, 3)
	for i, want := range []string{"", "", "ip_cap", ""} {
		ip := "1.1.1.1"
		if i == 3 {
			ip = "2.2.2.2"
		}
		reason, ok := c.acquire(ip)
		if reason != want || ok != (want == "") {
			t.Fatalf("acquire %d = %q %v", i, reason, ok)
		}
	}
	if reason, ok := c.acquire("3.3.3.3"); ok || reason != "total_cap" {
		t.Fatalf("total cap = %q %v", reason, ok)
	}
	c.release("2.2.2.2")
	if _, ok := c.acquire("3.3.3.3"); !ok {
		t.Fatal("a freed slot is not given back")
	}
	c.release("1.1.1.1")
	c.release("1.1.1.1")
	if len(c.byIP) != 1 {
		t.Fatalf("empty entries linger: %v", c.byIP)
	}
}

func TestDefaultsAreTheB43Values(t *testing.T) {
	o := StreamOptions{}.withDefaults()
	if o.MaxStreamsPerIP != 50 || o.MaxStreams != 3000 || o.TicketsPerMinute != 60 || o.ReconnectWait == nil {
		t.Fatalf("%+v", o)
	}
	lo, hi := time.Hour, time.Duration(0)
	for i := 0; i < 500; i++ {
		w := randomReconnectWait()
		lo, hi = min(lo, w), max(hi, w)
		if w < time.Second || w > 5*time.Second {
			t.Fatalf("wait %v outside 1 to 5 seconds", w)
		}
	}
	if hi-lo < 3*time.Second {
		t.Fatalf("500 waits only span %v..%v", lo, hi)
	}
}

func TestWriteEventSplitsMultiLineData(t *testing.T) {
	var b bytes.Buffer
	if err := writeEvent(&b, StreamMessage{Data: []byte("a\nb")}); err != nil {
		t.Fatal(err)
	}
	if b.String() != "data: a\ndata: b\n\n" {
		t.Fatalf("%q", b.String())
	}
}

func TestTrustedFromIsTrueOnlyWithTheProxySecret(t *testing.T) {
	var got []bool
	h := ProxyGuard(testSecret)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { got = append(got, TrustedFrom(r.Context())) }))
	req := httptest.NewRequest("GET", "/healthz", nil)
	h.ServeHTTP(httptest.NewRecorder(), req)
	req = httptest.NewRequest("GET", "/healthz", nil)
	req.Header.Set(ProxySecretHeader, testSecret)
	h.ServeHTTP(httptest.NewRecorder(), req)
	if len(got) != 2 || got[0] || !got[1] || TrustedFrom(context.Background()) {
		t.Fatalf("trusted = %v", got)
	}
}
