package liveupdates_test

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/telemetry"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// The rows of ../queuewrites/testdata/queue.seed.sql: three clubs (Smash, Lapsed, Other), their accounts, an admin, players with accounts and sessions.
const (
	clubSmash    = "c9000000-0000-4000-8000-000000000001"
	clubOther    = "c9000000-0000-4000-8000-000000000003"
	smashLogin   = "c7000000-0000-4000-8000-000000000001"
	otherLogin   = "c7000000-0000-4000-8000-000000000003"
	adminLogin   = "ad100000-0000-4000-8000-000000000001"
	playerAnn    = "d4000000-0000-4000-8000-000000000001"
	playerBen    = "d4000000-0000-4000-8000-000000000002"
	annLogin     = "f4000000-0000-4000-8000-000000000001"
	benLogin     = "f4000000-0000-4000-8000-000000000002"
	sessionPrep  = "a3000000-0000-4000-8000-000000000001" // Smash, slug prep-open
	sessionLive  = "a3000000-0000-4000-8000-000000000003" // Smash, slug live-now
	sessionLapse = "a3000000-0000-4000-8000-000000000007" // Lapsed Club
	slugPrep     = "prep-open"
)

var testNow = time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC)

// harness is the whole live-update stack on a real Postgres: publisher, hub, service and the stream routes behind the real proxy guard.
type harness struct {
	t         *testing.T
	env       *writetest.Env
	pool      *pgxpool.Pool
	hub       *liveupdates.Hub
	pub       *liveupdates.Publisher
	svc       *liveupdates.Service
	metrics   *telemetry.LiveMetrics
	readiness *httpapi.Readiness
	srv       *httptest.Server
	cancel    context.CancelFunc
	done      chan struct{}
	passes    map[string]string
	gate      listenerGate
	opts      harnessOpts
}

type harnessOpts struct {
	poll     time.Duration // 0: 20 ms
	stream   httpapi.StreamOptions
	observer liveupdates.Observer
	noRun    bool // leave the publisher stopped (the test drives ReadNow)
	hubBuf   int  // 0: the default
}

// listenerGate lets a test cut the listener off: while shut, the publisher cannot open its direct connection.
type listenerGate struct{ shut atomic.Bool }

func newHarness(t *testing.T, o harnessOpts) *harness {
	t.Helper()
	h := &harness{t: t, passes: map[string]string{}}
	h.env = writetest.NewEnvFull(t, testNow, func(pool *pgxpool.Pool, _ *session.Service, _ *store.Store, _ *slog.Logger, _ func() time.Time) func(*http.ServeMux) {
		h.pool = pool
		return func(*http.ServeMux) {}
	})
	h.env.Clubs, h.env.Players = true, true
	h.env.Reseed(t, writetest.ReadSeed(t, "../queuewrites/testdata", "queue.seed.sql"), nil)
	h.opts = o
	h.start()
	t.Cleanup(h.stop)
	return h
}

// start builds the publisher, hub, service and server on the harness's database. restart does it again with the database kept: an API restart.
func (h *harness) start() {
	t, o := h.t, h.opts
	var err error
	if h.metrics, err = telemetry.NewLiveMetrics(); err != nil {
		t.Fatal(err)
	}
	h.hub = liveupdates.NewHub(o.hubBuf)
	conn := h.pool.Config().ConnString()
	listen := func(ctx context.Context) (*pgx.Conn, error) {
		if h.gate.shut.Load() {
			return nil, errors.New("the direct connection is cut")
		}
		return pgx.Connect(ctx, conn)
	}
	poll := o.poll
	if poll == 0 {
		poll = 20 * time.Millisecond
	}
	h.pub = liveupdates.NewPublisher(h.pool, listen, h.hub, liveupdates.PublisherOptions{
		Poll: poll, ReconnectMin: 20 * time.Millisecond, ReconnectMax: 100 * time.Millisecond, Metrics: h.metrics, Observer: o.observer,
	})
	h.svc = liveupdates.NewService(h.pool, h.env.Service.Authenticator(), h.pub, nil)
	ctx, cancel := context.WithCancel(context.Background())
	h.cancel = cancel
	h.done = make(chan struct{})
	h.readiness = httpapi.NewReadiness()
	if o.noRun {
		close(h.done)
	} else {
		go func() { defer close(h.done); h.pub.Run(ctx) }()
		select {
		case <-h.pub.Ready():
		case <-time.After(10 * time.Second):
			t.Fatal("the publisher never became ready")
		}
	}
	so := o.stream
	so.Backend, so.Metrics = h.svc, h.metrics
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	h.srv = httptest.NewServer(httpapi.NewHandler(httpapi.Deps{
		Logger: log, Pinger: h.pool, Readiness: h.readiness, ProxySecret: writetest.ProxySecret,
		AllowedOrigins: []string{"http://localhost:9000"}, Stream: so,
	}))
}

func (h *harness) stop() {
	h.srv.CloseClientConnections()
	h.srv.Close()
	h.cancel()
	<-h.done
}

// pass signs in once per subject and app.
func (h *harness) pass(app, subject string) string {
	h.t.Helper()
	key := app + subject
	if p, ok := h.passes[key]; ok {
		return p
	}
	var p string
	switch app {
	case "club":
		p = h.env.ClubPass(h.t, subject)
	case "player":
		p = h.env.PlayerPass(h.t, subject)
	case "admin":
		p = h.env.AdminPass(h.t, subject)
	}
	if p == "" {
		h.t.Fatalf("no pass for %s %s", app, subject)
	}
	h.passes[key] = p
	return p
}

// who is one way to ask: an app and a pass, or a visitor (empty).
type who struct{ app, pass, ip string }

func (h *harness) ticketRequest(w who, topics ...string) (*http.Response, error) {
	h.t.Helper()
	body, _ := json.Marshal(map[string]any{"topics": topics})
	req, _ := http.NewRequest(http.MethodPost, h.srv.URL+"/api/stream/ticket", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	if w.app != "" {
		req.Header.Set(session.AppHeader, w.app)
		req.Header.Set(httpapi.ProxySecretHeader, writetest.ProxySecret)
	}
	if w.ip != "" {
		req.Header.Set(httpapi.ProxySecretHeader, writetest.ProxySecret)
		req.Header.Set("X-Forwarded-For", w.ip)
	}
	if w.pass != "" {
		req.Header.Set("Authorization", "Bearer "+w.pass)
	}
	return http.DefaultClient.Do(req)
}

type ticketReply struct {
	Ticket           string   `json:"ticket"`
	ExpiresInSeconds int      `json:"expiresInSeconds"`
	Topics           []string `json:"topics"`
}

// ticket asks for a ticket and returns the reply, or the status when it was refused.
func (h *harness) ticket(w who, topics ...string) (ticketReply, int) {
	h.t.Helper()
	resp, err := h.ticketRequest(w, topics...)
	if err != nil {
		h.t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var out ticketReply
	if resp.StatusCode == http.StatusOK {
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			h.t.Fatal(err)
		}
	}
	return out, resp.StatusCode
}

// sse is one received server-sent event.
type sse struct {
	ID, Event, Data string
	Retry           string
}

func (e sse) changed(t testing.TB) liveupdates.ChangedData {
	t.Helper()
	var d liveupdates.ChangedData
	if err := json.Unmarshal([]byte(e.Data), &d); err != nil {
		t.Fatalf("data %q: %v", e.Data, err)
	}
	return d
}

// stream is one open stream and what it received.
type stream struct {
	t      *testing.T
	resp   *http.Response
	events chan sse
	cancel context.CancelFunc
}

// open opens the stream of a ticket. lastEventID is sent as the Last-Event-ID header when set.
func (h *harness) open(ticket, lastEventID string) *stream {
	h.t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, h.srv.URL+"/stream?ticket="+ticket, nil)
	if lastEventID != "" {
		req.Header.Set("Last-Event-ID", lastEventID)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		cancel()
		h.t.Fatal(err)
	}
	s := &stream{t: h.t, resp: resp, events: make(chan sse, 256), cancel: cancel}
	if resp.StatusCode == http.StatusOK {
		go s.read()
	}
	h.t.Cleanup(s.close)
	return s
}

func (s *stream) read() {
	defer close(s.events)
	sc := bufio.NewScanner(s.resp.Body)
	var cur sse
	has := false
	for sc.Scan() {
		line := sc.Text()
		switch {
		case line == "":
			if has {
				s.events <- cur
			}
			cur, has = sse{}, false
		case strings.HasPrefix(line, ":"):
		case strings.HasPrefix(line, "id: "):
			cur.ID, has = strings.TrimPrefix(line, "id: "), true
		case strings.HasPrefix(line, "event: "):
			cur.Event, has = strings.TrimPrefix(line, "event: "), true
		case strings.HasPrefix(line, "data: "):
			cur.Data, has = strings.TrimPrefix(line, "data: "), true
		case strings.HasPrefix(line, "retry: "):
			cur.Retry, has = strings.TrimPrefix(line, "retry: "), true
		}
	}
}

func (s *stream) close() {
	s.cancel()
	_ = s.resp.Body.Close()
}

// next waits for the next event.
func (s *stream) next(d time.Duration) (sse, bool) {
	select {
	case e, ok := <-s.events:
		return e, ok
	case <-time.After(d):
		return sse{}, false
	}
}

// expect waits for an event with this name, skipping none: the next event must be it.
func (s *stream) expect(name string) sse {
	s.t.Helper()
	e, ok := s.next(5 * time.Second)
	if !ok {
		s.t.Fatalf("no %q event", name)
	}
	if e.Event != name {
		s.t.Fatalf("got event %q (%s), want %q", e.Event, e.Data, name)
	}
	return e
}

// quiet fails when anything arrives within d.
func (s *stream) quiet(d time.Duration) {
	s.t.Helper()
	if e, ok := s.next(d); ok {
		s.t.Fatalf("unexpected event %+v", e)
	}
}

// watch opens a stream on topics for who, consumes its "ready" event and returns it with its position.
func (h *harness) watch(w who, topics ...string) (*stream, string) {
	h.t.Helper()
	tk, code := h.ticket(w, topics...)
	if code != http.StatusOK {
		h.t.Fatalf("ticket refused: %d", code)
	}
	s := h.open(tk.Ticket, "")
	ready := s.expect("ready")
	return s, ready.ID
}

func uid(s string) pgtype.UUID { return pgtype.UUID{Bytes: uuid.MustParse(s), Valid: true} }

// commit appends events in one transaction and commits.
func (h *harness) commit(evs ...liveupdates.Event) []int64 {
	h.t.Helper()
	tx, err := h.pool.Begin(context.Background())
	if err != nil {
		h.t.Fatal(err)
	}
	var ids []int64
	for _, ev := range evs {
		id, err := liveupdates.Append(context.Background(), tx, ev)
		if err != nil {
			_ = tx.Rollback(context.Background())
			h.t.Fatal(err)
		}
		ids = append(ids, id)
	}
	if err := tx.Commit(context.Background()); err != nil {
		h.t.Fatal(err)
	}
	return ids
}

func sessionEvent(session, kind string) liveupdates.Event {
	return liveupdates.Event{ClubID: uid(clubSmash), SessionID: uid(session), Kind: kind}
}

func (h *harness) scalar(sql string, args ...any) string {
	h.t.Helper()
	var v any
	if err := h.pool.QueryRow(context.Background(), sql, args...).Scan(&v); err != nil {
		h.t.Fatal(err)
	}
	return fmt.Sprint(v)
}

// settle waits until the publisher has pushed every event the database lets through right now.
func (h *harness) settle() liveupdates.Position {
	h.t.Helper()
	var head liveupdates.Position
	var xact string
	var id int64
	err := h.pool.QueryRow(context.Background(), `SELECT xact_id::text, id FROM live_update_events WHERE xact_id < pg_snapshot_xmin(pg_current_snapshot()) ORDER BY xact_id DESC, id DESC LIMIT 1`).Scan(&xact, &id)
	if err == nil {
		head, _ = liveupdates.ParsePosition(xact + ":" + itoa(id))
	}
	deadline := time.Now().Add(5 * time.Second)
	for h.pub.Cursor() != head {
		if time.Now().After(deadline) {
			h.t.Fatalf("the publisher is at %v, the head is %v", h.pub.Cursor(), head)
		}
		time.Sleep(5 * time.Millisecond)
	}
	return head
}
