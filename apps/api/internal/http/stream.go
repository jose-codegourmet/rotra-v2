package httpapi

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"slices"
	"strconv"
	"sync"
	"time"
)

const (
	streamTicketPath = "/api/stream/ticket"
	streamPath       = "/stream"
)

// StreamOptions tunes tickets and the stream. Zero values take the B-41/B-43 defaults; tests shorten them.
type StreamOptions struct {
	TicketTTL        time.Duration // default 60 s
	Heartbeat        time.Duration // default 20 s
	TicketsPerMinute int           // per trusted client IP, default 60 (B-43)
	Now              func() time.Time

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
	if o.Now == nil {
		o.Now = time.Now
	}
	return o
}

// ticketStore keeps random, unguessable tickets in memory until used or expired (one API instance,
// B-43). Redeeming deletes the ticket, so it works once. It also holds the per-IP issue counters.
type ticketStore struct {
	opts    StreamOptions
	mu      sync.Mutex
	tickets map[string]time.Time // ticket -> expiry
	windows map[string]*window
}

type window struct {
	start time.Time
	count int
}

func newTicketStore(o StreamOptions) *ticketStore {
	return &ticketStore{opts: o, tickets: map[string]time.Time{}, windows: map[string]*window{}}
}

func (s *ticketStore) size() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.tickets)
}

// issue returns a new ticket, or ok=false with the seconds to wait when ip is over its per-minute limit.
func (s *ticketStore) issue(ip string) (ticket string, retryAfter int, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.opts.Now()
	s.pruneLocked(now)

	w := s.windows[ip]
	if w == nil || now.Sub(w.start) >= time.Minute {
		w = &window{start: now}
		s.windows[ip] = w
	}
	if w.count >= s.opts.TicketsPerMinute {
		wait := int((time.Minute - now.Sub(w.start)).Seconds()) + 1
		return "", max(wait, 1), false
	}
	w.count++

	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic("crypto/rand unavailable: " + err.Error())
	}
	ticket = base64.RawURLEncoding.EncodeToString(b[:])
	s.tickets[ticket] = now.Add(s.opts.TicketTTL)
	return ticket, 0, true
}

// redeem consumes the ticket: true only the first time, and only before it expires.
func (s *ticketStore) redeem(ticket string) bool {
	if ticket == "" {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	exp, found := s.tickets[ticket]
	if !found {
		return false
	}
	delete(s.tickets, ticket)
	return s.opts.Now().Before(exp)
}

func (s *ticketStore) pruneLocked(now time.Time) {
	for t, exp := range s.tickets {
		if !now.Before(exp) {
			delete(s.tickets, t)
		}
	}
	for ip, w := range s.windows {
		if now.Sub(w.start) >= time.Minute {
			delete(s.windows, ip)
		}
	}
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
				h.Set("Access-Control-Allow-Headers", "Content-Type")
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

// registerStream adds the ticket route and the SSE stream route.
func registerStream(mux *http.ServeMux, d Deps, store *ticketStore) {
	opts := store.opts

	issueTicket := func(w http.ResponseWriter, r *http.Request) {
		ticket, retry, ok := store.issue(ClientIPFrom(r.Context()))
		if !ok {
			w.Header().Set("Retry-After", strconv.Itoa(retry))
			WriteJSON(w, http.StatusTooManyRequests,
				errorBody{Error: errorDetail{Code: "rate_limited", Message: "Too many requests. Try again shortly."}}, Private)
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{
			"ticket":           ticket,
			"expiresInSeconds": int(opts.TicketTTL.Seconds()),
		}, Private)
	}

	stream := func(w http.ResponseWriter, r *http.Request) {
		if !store.redeem(r.URL.Query().Get("ticket")) {
			WriteError(w, ErrUnauthenticated, nil)
			return
		}
		if opts.onStreamEnd != nil {
			defer opts.onStreamEnd()
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
		tick := time.NewTicker(opts.Heartbeat)
		defer tick.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-draining:
				return
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
