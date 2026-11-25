// Package testclock is the Go API's test-only virtual clock for the regression suite (apps/e2e).
//
// It is never part of a normal build: cmd/api reaches it only through the `e2e` build tag, and even
// then FromEnv returns nil unless ROTRA_E2E_CLOCK=1. With it on, FromEnv refuses to start unless the
// database is the local throwaway one (the same host, port and name apps/e2e/src/guard.ts allows),
// and the control endpoint binds 127.0.0.1 only.
//
// The clock is the real clock plus an offset the suite sets, so it keeps ticking. It never runs
// earlier than real time: Postgres defaults (`now()`) keep real time, so a virtual time behind it
// would put a row's own timestamp ahead of "now".
package testclock

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"
)

const (
	// EnvVar turns the clock on ("1"). Anything else leaves it off.
	EnvVar = "ROTRA_E2E_CLOCK"
	// AddrEnvVar is the control endpoint's address, host 127.0.0.1 only.
	AddrEnvVar = "ROTRA_E2E_CLOCK_ADDR"
	// DefaultAddr is the control endpoint when AddrEnvVar is unset.
	DefaultAddr = "127.0.0.1:9193"

	// The one database the clock may run against. Keep in step with apps/e2e/src/guard.ts.
	allowedPort = "54329"
	allowedDB   = "rotra_disposable_e2e"
)

// ErrBeforeRealTime is returned by Set for a time earlier than the real clock.
var ErrBeforeRealTime = errors.New("testclock: the time is before real time; the database clock cannot go back")

// Clock is real time plus an offset.
type Clock struct {
	real   func() time.Time
	mu     sync.RWMutex
	offset time.Duration
}

// New returns a clock at real time. A nil real is time.Now.
func New(real func() time.Time) *Clock {
	if real == nil {
		real = time.Now
	}
	return &Clock{real: real}
}

// Now is the virtual now.
func (c *Clock) Now() time.Time {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.real().Add(c.offset)
}

// Set makes t the virtual now; it keeps ticking from there.
func (c *Clock) Set(t time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	real := c.real()
	if t.Before(real) {
		return ErrBeforeRealTime
	}
	c.offset = t.Sub(real)
	return nil
}

// Reset goes back to real time.
func (c *Clock) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.offset = 0
}

type state struct {
	NowMs     int64 `json:"nowMs"`
	OffsetMs  int64 `json:"offsetMs"`
	RealNowMs int64 `json:"realNowMs"`
}

func (c *Clock) state() state {
	c.mu.RLock()
	defer c.mu.RUnlock()
	real := c.real()
	return state{NowMs: real.Add(c.offset).UnixMilli(), OffsetMs: c.offset.Milliseconds(), RealNowMs: real.UnixMilli()}
}

func reply(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// Handler is the control endpoint, the same contract as the Node servers' (apps/e2e/src/server-clock.mjs):
//
//	GET  /clock                 -> { nowMs, offsetMs, realNowMs }
//	POST /clock {"nowMs": n}    -> sets the virtual now; 409 if n is before real time
//	POST /clock {"reset": true} -> back to real time
func (c *Clock) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/clock", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			reply(w, http.StatusOK, c.state())
		case http.MethodPost:
			var body struct {
				Reset bool   `json:"reset"`
				NowMs *int64 `json:"nowMs"`
			}
			if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&body); err != nil {
				reply(w, http.StatusUnprocessableEntity, map[string]string{"error": "invalid_json"})
				return
			}
			switch {
			case body.Reset:
				c.Reset()
			case body.NowMs != nil:
				if err := c.Set(time.UnixMilli(*body.NowMs)); err != nil {
					out := map[string]any{"error": err.Error(), "realNowMs": c.state().RealNowMs}
					reply(w, http.StatusConflict, out)
					return
				}
			default:
				reply(w, http.StatusUnprocessableEntity, map[string]string{"error": "nowMs must be a number"})
				return
			}
			reply(w, http.StatusOK, c.state())
		default:
			reply(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		}
	})
	return mux
}

// AllowedDatabase returns nil only for a Postgres URL on 127.0.0.1 or localhost, port 54329, database rotra_disposable_e2e.
func AllowedDatabase(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil || rawURL == "" {
		return errors.New("DATABASE_URL is not a valid URL")
	}
	if u.Scheme != "postgresql" && u.Scheme != "postgres" {
		return errors.New("DATABASE_URL is not a postgresql:// URL")
	}
	if h := u.Hostname(); h != "127.0.0.1" && h != "localhost" {
		return fmt.Errorf("DATABASE_URL host %q is not 127.0.0.1 or localhost", h)
	}
	if u.Port() != allowedPort {
		return fmt.Errorf("DATABASE_URL port %q is not %s", u.Port(), allowedPort)
	}
	if db := u.Path; db != "/"+allowedDB {
		return fmt.Errorf("DATABASE_URL database %q is not %q", db, allowedDB)
	}
	return nil
}

// FromEnv returns nil, nil unless ROTRA_E2E_CLOCK=1. When it is on it refuses (an error, so the API
// does not start) unless databaseURL is the local throwaway database.
func FromEnv(lookup func(string) (string, bool), databaseURL string) (*Clock, error) {
	if v, _ := lookup(EnvVar); v != "1" {
		return nil, nil
	}
	if err := AllowedDatabase(databaseURL); err != nil {
		return nil, fmt.Errorf("%s=1 refused: %w", EnvVar, err)
	}
	return New(nil), nil
}

// Serve answers the control endpoint on addr, which must be a 127.0.0.1 address, until ctx ends.
func Serve(ctx context.Context, c *Clock, addr string) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil || host != "127.0.0.1" {
		return fmt.Errorf("testclock: the control endpoint binds 127.0.0.1 only, got %q", addr)
	}
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	srv := &http.Server{Handler: c.Handler(), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdown)
	}()
	if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
