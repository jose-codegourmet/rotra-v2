package httpapi

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"
)

const (
	streamTicketPath = "/api/stream/ticket"
	streamPath       = "/stream"
)

// StreamOptions tunes tickets and the stream. Zero values take the B-41/B-43/B-44 defaults; tests shorten them.
type StreamOptions struct {
	TicketTTL        time.Duration // default 60 s
	Heartbeat        time.Duration // default 20 s
	TicketsPerMinute int           // per trusted client IP, default 60 (B-43)
	MaxStreamsPerIP  int           // open streams per trusted client IP, default 50 (B-43)
	MaxStreams       int           // open streams in total, default 3,000 (B-43)
	Now              func() time.Time

	// Backend answers who may watch what and feeds the stream (live updates). Nil keeps the routes as bare tickets and a
	// heartbeat, with nothing to watch.
	Backend StreamBackend
	// Metrics records refusals and open streams. Nil records nothing.
	Metrics StreamMetrics
	// ReconnectWait picks the wait a closing stream tells its phone to keep before reconnecting (B-44). Default: random,
	// 1 to 5 seconds, so a deploy's reconnects do not land in the same second.
	ReconnectWait func() time.Duration

	onStreamEnd func() // test hook: called when a stream handler returns
}

func (o StreamOptions) withDefaults() StreamOptions {
	if o.TicketTTL <= 0 {
		o.TicketTTL = 60 * time.Second
	}
	if o.Heartbeat <= 0 {
		o.Heartbeat = 20 * time.Second
	}
	if o.TicketsPerMinute <= 0 {
		o.TicketsPerMinute = 60
	}
	if o.MaxStreamsPerIP <= 0 {
		o.MaxStreamsPerIP = 50
	}
	if o.MaxStreams <= 0 {
		o.MaxStreams = 3000
	}
	if o.Now == nil {
		o.Now = time.Now
	}
	if o.ReconnectWait == nil {
		o.ReconnectWait = randomReconnectWait
	}
	return o
}

// randomReconnectWait is 1 to 5 seconds, uniform to the millisecond (B-44).
func randomReconnectWait() time.Duration {
	n, err := rand.Int(rand.Reader, big.NewInt(4001))
	if err != nil {
		return 3 * time.Second
	}
	return time.Second + time.Duration(n.Int64())*time.Millisecond
}

// StreamBackend is what the stream routes ask the live-updates package (kept an interface so this package does not
// import it). Identify and Grant run on the ticket route, Open on the stream route.
type StreamBackend interface {
	// Identify says who asks for a ticket. signedIn viewers are never limited (B-43). When ok is false it has already
	// answered (for example the distinct 401 "expired" that makes the client refresh once).
	Identify(w http.ResponseWriter, r *http.Request) (viewer any, signedIn, ok bool)
	// Grant checks which of topics the viewer may watch and returns what the ticket carries and the accepted topic names.
	// A *StreamError answers with its code.
	Grant(r *http.Request, viewer any, topics []string) (grant any, accepted []string, err error)
	// Open starts the feed of a redeemed ticket. lastEventID is the position the phone last saw, or "".
	Open(r *http.Request, grant any, lastEventID string) (StreamFeed, error)
}

// StreamError is an error a StreamBackend wants answered with one of the service error codes.
type StreamError struct{ Code ErrorCode }

func (e *StreamError) Error() string { return string(e.Code) }

// StreamFeed is one open screen's messages. The channel closes when the feed ends on its own (a screen too slow to keep
// up): the stream then tells the phone to reconnect.
type StreamFeed interface {
	Messages() <-chan StreamMessage
	Close()
}

// StreamMessage is one server-sent event.
type StreamMessage struct {
	ID    string // the stream position after this event; empty leaves the phone's last id alone
	Event string
	Data  []byte
}

// StreamMetrics counts what the limits refuse and what is open (B-43). Reasons: "ip_cap", "total_cap", "ticket_rate".
type StreamMetrics interface {
	StreamRefused(reason string)
	StreamOpened()
	StreamClosed()
}

// ticketData is what a ticket stands for: who asked (the trusted client IP at issue time, because the stream itself is
// opened straight on the API domain where no proxy tells the real address) and what they may watch.
type ticketData struct {
	expires  time.Time
	ip       string
	signedIn bool
	grant    any
}

// ticketStore keeps random, unguessable tickets in memory until used or expired (one API instance,
// B-43). Redeeming deletes the ticket, so it works once. Issuing is limited per IP by a RateLimiter, except for signed-in
// viewers, who are never limited.
type ticketStore struct {
	opts    StreamOptions
	limiter *RateLimiter
	mu      sync.Mutex
	tickets map[string]ticketData
}

func newTicketStore(o StreamOptions) *ticketStore {
	return &ticketStore{opts: o, limiter: NewRateLimiter(o.TicketsPerMinute, o.Now), tickets: map[string]ticketData{}}
}

func (s *ticketStore) size() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.tickets)
}

// allow counts one ticket request against ip's minute. It says ok=false with the seconds to wait when ip is over.
func (s *ticketStore) allow(ip string) (retryAfter int, ok bool) { return s.limiter.Allow(ip) }

// issue returns a new ticket, or ok=false with the seconds to wait when ip is over its per-minute limit.
func (s *ticketStore) issue(ip string) (ticket string, retryAfter int, ok bool) {
	if retry, ok := s.limiter.Allow(ip); !ok {
		return "", retry, false
	}
	return s.mint(ticketData{ip: ip}), 0, true
}

// mint stores a ticket for t without counting it against the limiter (the caller already did, or the viewer is signed in).
func (s *ticketStore) mint(t ticketData) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.opts.Now()
	s.pruneLocked(now)

	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic("crypto/rand unavailable: " + err.Error())
	}
	ticket := base64.RawURLEncoding.EncodeToString(b[:])
	t.expires = now.Add(s.opts.TicketTTL)
	s.tickets[ticket] = t
	return ticket
}

// redeem consumes the ticket: found only the first time, and only before it expires.
func (s *ticketStore) redeem(ticket string) (ticketData, bool) {
	if ticket == "" {
		return ticketData{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	t, found := s.tickets[ticket]
	if !found {
		return ticketData{}, false
	}
	delete(s.tickets, ticket)
	return t, s.opts.Now().Before(t.expires)
}

func (s *ticketStore) pruneLocked(now time.Time) {
	for k, t := range s.tickets {
		if !now.Before(t.expires) {
			delete(s.tickets, k)
		}
	}
}

// streamCounter holds the open-stream caps (B-43): per trusted client IP and in total. A signed-in screen is never
// counted against them.
type streamCounter struct {
	perIP, total int
	mu           sync.Mutex
	byIP         map[string]int
	open         int
}

func newStreamCounter(perIP, total int) *streamCounter {
	return &streamCounter{perIP: perIP, total: total, byIP: map[string]int{}}
}

// acquire takes a slot for ip. reason is "ip_cap" or "total_cap" when refused.
func (c *streamCounter) acquire(ip string) (reason string, ok bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.open >= c.total {
		return "total_cap", false
	}
	if c.byIP[ip] >= c.perIP {
		return "ip_cap", false
	}
	c.byIP[ip]++
	c.open++
	return "", true
}

func (c *streamCounter) release(ip string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.byIP[ip] <= 1 {
		delete(c.byIP, ip)
	} else {
		c.byIP[ip]--
	}
	c.open--
}

// corsFor wraps a stream route: an exact-match allowlist, never "*", and nothing at all for an origin
// that is not listed. Only the two stream routes use it (B-41).
func corsFor(allowed []string, methods string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" && slices.Contains(allowed, origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Add("Vary", "Origin")
			if r.Method == http.MethodOptions {
				h.Set("Access-Control-Allow-Methods", methods+", OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID")
				h.Set("Access-Control-Max-Age", "600")
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// ticketRequest is the optional body of the ticket route: the topics the screen wants to watch.
type ticketRequest struct {
	Topics []string `json:"topics"`
}

const maxTicketBody = 8 << 10

// registerStream adds the ticket route and the SSE stream route.
func registerStream(mux *http.ServeMux, d Deps, store *ticketStore) {
	opts := store.opts
	counter := newStreamCounter(opts.MaxStreamsPerIP, opts.MaxStreams)
	refuse := func(reason string) {
		if opts.Metrics != nil {
			opts.Metrics.StreamRefused(reason)
		}
	}

	issueTicket := func(w http.ResponseWriter, r *http.Request) {
		ip := ClientIPFrom(r.Context())
		var viewer any
		signedIn := false
		if opts.Backend != nil {
			var ok bool
			if viewer, signedIn, ok = opts.Backend.Identify(w, r); !ok {
				return
			}
		}
		if !signedIn {
			if retry, ok := store.allow(ip); !ok {
				refuse("ticket_rate")
				WriteRateLimited(w, retry, "Too many requests. Try again shortly.")
				return
			}
		}
		var req ticketRequest
		if r.Body != nil {
			raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxTicketBody))
			if err != nil {
				WriteError(w, ErrInvalid, map[string]string{"topics": "Send a smaller list of topics."})
				return
			}
			if len(strings.TrimSpace(string(raw))) > 0 {
				if err := json.Unmarshal(raw, &req); err != nil {
					WriteError(w, ErrInvalid, map[string]string{"topics": "Send {\"topics\": [...]}."})
					return
				}
			}
		}
		accepted := []string{}
		var grant any
		if opts.Backend != nil && len(req.Topics) > 0 {
			var err error
			if grant, accepted, err = opts.Backend.Grant(r, viewer, req.Topics); err != nil {
				var se *StreamError
				if errors.As(err, &se) {
					WriteError(w, se.Code, nil)
					return
				}
				WriteInternal(w)
				return
			}
		}
		ticket := store.mint(ticketData{ip: ip, signedIn: signedIn, grant: grant})
		WriteJSON(w, http.StatusOK, map[string]any{
			"ticket":           ticket,
			"expiresInSeconds": int(opts.TicketTTL.Seconds()),
			"topics":           accepted,
		}, Private)
	}

	stream := func(w http.ResponseWriter, r *http.Request) {
		t, ok := store.redeem(r.URL.Query().Get("ticket"))
		if !ok {
			WriteError(w, ErrUnauthenticated, nil)
			return
		}
		if opts.onStreamEnd != nil {
			defer opts.onStreamEnd()
		}
		// A signed-in screen is never limited (B-43). The others count against their IP and the total; a refused screen
		// shows the Refresh bar instead.
		if !t.signedIn {
			reason, ok := counter.acquire(t.ip)
			if !ok {
				refuse(reason)
				WriteRateLimited(w, 30, "Live updates are busy. Use Refresh.")
				return
			}
			defer counter.release(t.ip)
		}
		var feed StreamFeed
		if opts.Backend != nil && t.grant != nil {
			last := r.Header.Get("Last-Event-ID")
			if last == "" {
				last = r.URL.Query().Get("lastEventId")
			}
			var err error
			if feed, err = opts.Backend.Open(r, t.grant, last); err != nil {
				WriteError(w, ErrUnavailable, nil)
				return
			}
			defer feed.Close()
		}
		if opts.Metrics != nil {
			opts.Metrics.StreamOpened()
			defer opts.Metrics.StreamClosed()
		}
		rc := http.NewResponseController(w)
		h := w.Header()
		h.Set("Content-Type", "text/event-stream")
		h.Set("Cache-Control", "no-store")
		h.Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte(": connected\n\n")); err != nil || rc.Flush() != nil {
			return
		}

		var draining <-chan struct{}
		if d.Readiness != nil {
			draining = d.Readiness.Done()
		}
		var messages <-chan StreamMessage
		if feed != nil {
			messages = feed.Messages()
		}
		// farewell tells the phone how long to wait before it reconnects with its last event id (B-44): the retry field for
		// EventSource, and a named event for a client that reads the stream itself.
		farewell := func() {
			wait := opts.ReconnectWait()
			ms := wait.Milliseconds()
			_, _ = fmt.Fprintf(w, "retry: %d\nevent: reconnect\ndata: {\"retryMs\":%d}\n\n", ms, ms)
			_ = rc.Flush()
		}
		tick := time.NewTicker(opts.Heartbeat)
		defer tick.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-draining:
				farewell()
				return
			case m, open := <-messages:
				if !open {
					farewell()
					return
				}
				if err := writeEvent(w, m); err != nil || rc.Flush() != nil {
					return
				}
			case <-tick.C:
				if _, err := w.Write([]byte(": ping\n\n")); err != nil || rc.Flush() != nil {
					return
				}
			}
		}
	}

	mux.HandleFunc("POST "+streamTicketPath, corsFor(d.AllowedOrigins, "POST", issueTicket))
	mux.HandleFunc("OPTIONS "+streamTicketPath, corsFor(d.AllowedOrigins, "POST", nil))
	mux.HandleFunc("GET "+streamPath, corsFor(d.AllowedOrigins, "GET", stream))
	mux.HandleFunc("OPTIONS "+streamPath, corsFor(d.AllowedOrigins, "GET", nil))
}

// writeEvent writes one server-sent event.
func writeEvent(w io.Writer, m StreamMessage) error {
	var b strings.Builder
	if m.ID != "" {
		b.WriteString("id: " + m.ID + "\n")
	}
	if m.Event != "" {
		b.WriteString("event: " + m.Event + "\n")
	}
	for _, line := range strings.Split(string(m.Data), "\n") {
		b.WriteString("data: " + line + "\n")
	}
	b.WriteString("\n")
	_, err := io.WriteString(w, b.String())
	return err
}
