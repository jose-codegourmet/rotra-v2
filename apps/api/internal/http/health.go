package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"
)

// Pinger is what /readyz needs from the database: a cheap round trip that fails when it is down.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Readiness turns false for good once shutdown begins (B-44).
type Readiness struct{ draining atomic.Bool }

func NewReadiness() *Readiness { return &Readiness{} }

// SetDraining marks the process as shutting down; /readyz fails from now on.
func (r *Readiness) SetDraining() { r.draining.Store(true) }

// Draining reports whether shutdown has begun.
func (r *Readiness) Draining() bool { return r.draining.Load() }

// Deps is what the HTTP layer is built from.
type Deps struct {
	Logger      *slog.Logger
	Pinger      Pinger
	Readiness   *Readiness
	PingTimeout time.Duration // default 2 s
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
	for _, register := range extra {
		register(mux)
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) { WriteError(w, ErrNotFound, nil) })

	var h http.Handler = mux
	h = Recover(d.Logger)(h)
	h = AccessLog(d.Logger)(h)
	return RequestID(h)
}
