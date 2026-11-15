package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// Pinger is what /readyz needs from the database: a cheap round trip that fails when it is down.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Readiness turns false for good once shutdown begins (B-44).
type Readiness struct {
	draining atomic.Bool
	once     sync.Once
	done     chan struct{}
}

func NewReadiness() *Readiness { return &Readiness{} }

func (r *Readiness) init() { r.once.Do(func() { r.done = make(chan struct{}) }) }

// SetDraining marks the process as shutting down; /readyz fails from now on and Done closes, which
// ends open streams so shutdown never waits on them.
func (r *Readiness) SetDraining() {
	r.init()
	if r.draining.CompareAndSwap(false, true) {
		close(r.done)
	}
}

// Done is closed once draining has begun.
func (r *Readiness) Done() <-chan struct{} {
	r.init()
	return r.done
}

// Draining reports whether shutdown has begun.
func (r *Readiness) Draining() bool { return r.draining.Load() }

// Deps is what the HTTP layer is built from.
type Deps struct {
	Logger      *slog.Logger
	Pinger      Pinger
	Readiness   *Readiness
	PingTimeout time.Duration // default 2 s

	// ProxySecret is ROTRA_PROXY_SECRET (B-30). Empty: no request is trusted as proxied.
	ProxySecret string
	// AllowedOrigins are the exact app origins CORS allows on the stream routes (B-41).
	AllowedOrigins []string
	Stream         StreamOptions
}

// NewHandler builds the router (Go's ServeMux patterns) wrapped in request id, access log and panic
// recovery. Later tracks add routes through extra.
func NewHandler(d Deps, extra ...func(*http.ServeMux)) http.Handler {
	if d.PingTimeout <= 0 {
		d.PingTimeout = 2 * time.Second
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"}, Private)
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if d.Readiness.Draining() {
			WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "draining"}, Private)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), d.PingTimeout)
		defer cancel()
		if err := d.Pinger.Ping(ctx); err != nil {
			d.Logger.LogAttrs(r.Context(), slog.LevelWarn, "not ready",
				slog.String("request_id", RequestIDFrom(r.Context())), slog.String("error", err.Error()))
			WriteError(w, ErrUnavailable, nil)
			return
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"}, Private)
	})
	registerStream(mux, d, newTicketStore(d.Stream.withDefaults()))
	for _, register := range extra {
		register(mux)
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) { WriteError(w, ErrNotFound, nil) })

	var h http.Handler = mux
	h = Recover(d.Logger)(h)
	h = ProxyGuard(d.ProxySecret)(h)
	h = AccessLog(d.Logger)(h)
	return RequestID(h)
}
