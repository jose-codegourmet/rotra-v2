package httpapi

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os/signal"
	"strings"
	"syscall"
	"testing"
	"time"
)

func discardLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

type harness struct {
	url     string
	ready   *Readiness
	cancel  context.CancelFunc
	done    chan error
	started chan struct{}
	release chan struct{}
}

// startServer runs Serve with a /slow route that holds until released.
func startServer(t *testing.T, ctx context.Context, cancel context.CancelFunc, grace time.Duration) *harness {
	t.Helper()
	h := &harness{ready: NewReadiness(), cancel: cancel, done: make(chan error, 1),
		started: make(chan struct{}), release: make(chan struct{})}
	handler := newTestHandler(fakePinger{}, h.ready, func(m *http.ServeMux) {
		m.HandleFunc("POST /slow", func(w http.ResponseWriter, _ *http.Request) {
			close(h.started)
			<-h.release
			_, _ = io.WriteString(w, "written")
		})
	})
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	h.url = "http://" + ln.Addr().String()
	srv := &http.Server{Handler: handler}
	go func() { h.done <- Serve(ctx, srv, ln, h.ready, grace, discardLogger()) }()
	return h
}

func TestShutdownLetsInFlightRequestFinishAndFailsReadyz(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	h := startServer(t, ctx, cancel, 5*time.Second)

	type result struct {
		body string
		err  error
	}
	res := make(chan result, 1)
	go func() {
		resp, err := http.Post(h.url+"/slow", "text/plain", nil)
		if err != nil {
			res <- result{err: err}
			return
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		res <- result{body: string(b)}
	}()
	<-h.started

	h.cancel() // what SIGTERM does
	deadline := time.Now().Add(2 * time.Second)
	for !h.ready.Draining() {
		if time.Now().After(deadline) {
			t.Fatal("readiness did not flip when shutdown began")
		}
		time.Sleep(time.Millisecond)
	}
	select {
	case <-h.done:
		t.Fatal("Serve returned while a request was still in flight")
	case <-time.After(100 * time.Millisecond):
	}

	close(h.release)
	r := <-res
	if r.err != nil || r.body != "written" {
		t.Fatalf("in-flight request should finish: %+v", r)
	}
	select {
	case err := <-h.done:
		if err != nil {
			t.Fatalf("clean shutdown returned %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("did not exit after the in-flight request finished")
	}
}

func TestShutdownGivesUpAfterGraceTimeout(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	h := startServer(t, ctx, cancel, 150*time.Millisecond)
	go func() { _, _ = http.Post(h.url+"/slow", "text/plain", nil) }()
	<-h.started

	start := time.Now()
	h.cancel()
	select {
	case err := <-h.done:
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("want deadline exceeded, got %v", err)
		}
		if time.Since(start) > 2*time.Second {
			t.Fatal("did not exit near the grace timeout")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("a stuck request kept the process alive past the grace timeout")
	}
	close(h.release)
}

func TestSIGTERMTriggersGracefulShutdown(t *testing.T) {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM)
	defer stop()
	h := startServer(t, ctx, stop, 5*time.Second)

	resp, err := http.Get(h.url + "/readyz")
	if err != nil || resp.StatusCode != 200 {
		t.Fatalf("not ready at start: %v", err)
	}
	_ = resp.Body.Close()

	if err := syscall.Kill(syscall.Getpid(), syscall.SIGTERM); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-h.done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("SIGTERM did not stop the server")
	}
	if !h.ready.Draining() {
		t.Fatal("readiness must be failing after SIGTERM")
	}
	if _, err := http.Get(h.url + "/readyz"); err == nil {
		t.Fatal("server should no longer accept connections")
	}
}

func TestServeReturnsListenError(t *testing.T) {
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	_ = ln.Close() // Serve on a closed listener fails immediately
	err := Serve(context.Background(), &http.Server{Handler: http.NewServeMux()}, ln, NewReadiness(), time.Second, discardLogger())
	if err == nil || strings.Contains(err.Error(), "closed") == false {
		t.Fatalf("got %v", err)
	}
}
