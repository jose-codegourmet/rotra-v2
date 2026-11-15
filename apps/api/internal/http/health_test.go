package httpapi

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakePinger struct {
	err   error
	block bool
}

func (f fakePinger) Ping(ctx context.Context) error {
	if f.block {
		<-ctx.Done()
		return ctx.Err()
	}
	return f.err
}

func newTestHandler(p Pinger, r *Readiness, extra ...func(*http.ServeMux)) http.Handler {
	inner := NewHandler(Deps{Logger: discardLogger(), Pinger: p, Readiness: r, PingTimeout: 50 * time.Millisecond, ProxySecret: testSecret}, extra...)
	// Behave like a proxied caller, so these tests keep exercising the routes themselves.
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		req.Header.Set(ProxySecretHeader, testSecret)
		inner.ServeHTTP(w, req)
	})
}

func get(h http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
	return rec
}

func TestHealthzIsAlwaysOK(t *testing.T) {
	r := NewReadiness()
	r.SetDraining()
	h := newTestHandler(fakePinger{err: errors.New("db down")}, r)
	if rec := get(h, "/healthz"); rec.Code != 200 {
		t.Fatalf("healthz must stay up while draining and with the DB down, got %d", rec.Code)
	}
}

func TestReadyzOKWhenDatabaseUp(t *testing.T) {
	h := newTestHandler(fakePinger{}, NewReadiness())
	rec := get(h, "/readyz")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"ready"`) {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("X-Request-Id") == "" {
		t.Error("request id middleware not applied")
	}
}

func TestReadyzFailsWhenDatabaseDown(t *testing.T) {
	h := newTestHandler(fakePinger{err: errors.New("connection refused host=db password=hunter2")}, NewReadiness())
	rec := get(h, "/readyz")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "hunter2") {
		t.Fatal("ping error detail leaked")
	}
	if !strings.Contains(rec.Body.String(), `"unavailable"`) {
		t.Fatalf("body %s", rec.Body.String())
	}
}

func TestReadyzFailsWhenPingHangs(t *testing.T) {
	start := time.Now()
	rec := get(newTestHandler(fakePinger{block: true}, NewReadiness()), "/readyz")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status %d", rec.Code)
	}
	if time.Since(start) > 2*time.Second {
		t.Fatal("ping timeout not applied")
	}
}

func TestReadyzFailsOnceDrainingBegins(t *testing.T) {
	r := NewReadiness()
	h := newTestHandler(fakePinger{}, r)
	if get(h, "/readyz").Code != 200 {
		t.Fatal("should start ready")
	}
	r.SetDraining()
	rec := get(h, "/readyz")
	if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), "draining") {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
}

func TestUnknownRouteIsJSONNotFound(t *testing.T) {
	rec := get(newTestHandler(fakePinger{}, NewReadiness()), "/nope")
	if rec.Code != 404 || !strings.Contains(rec.Body.String(), `"not_found"`) {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
}

func TestExtraRoutesRegister(t *testing.T) {
	h := newTestHandler(fakePinger{}, NewReadiness(), func(m *http.ServeMux) {
		m.HandleFunc("GET /hello", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "hi") })
	})
	if rec := get(h, "/hello"); rec.Body.String() != "hi" {
		t.Fatal(rec.Body.String())
	}
}
