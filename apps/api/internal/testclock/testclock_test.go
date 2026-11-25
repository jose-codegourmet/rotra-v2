package testclock

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const localDB = "postgresql://postgres:postgres@127.0.0.1:54329/rotra_disposable_e2e"

func lookup(m map[string]string) func(string) (string, bool) {
	return func(k string) (string, bool) { v, ok := m[k]; return v, ok }
}

func TestFromEnvIsOffWithoutTheVariable(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"unset": {},
		"zero":  {EnvVar: "0"},
		"empty": {EnvVar: ""},
	} {
		t.Run(name, func(t *testing.T) {
			// A production database URL is fine here: with the clock off nothing looks at it.
			c, err := FromEnv(lookup(env), "postgres://u:p@db.example.com:5432/rotra")
			if err != nil || c != nil {
				t.Fatalf("clock = %v, err = %v; want nil, nil", c, err)
			}
		})
	}
}

func TestFromEnvRefusesAnythingButTheLocalThrowawayDatabase(t *testing.T) {
	on := map[string]string{EnvVar: "1"}
	for name, url := range map[string]string{
		"empty":         "",
		"not a url":     "::nope",
		"hosted":        "postgresql://postgres:x@db.example.com:54329/rotra_disposable_e2e",
		"other port":    "postgresql://postgres:postgres@127.0.0.1:5432/rotra_disposable_e2e",
		"other db":      "postgresql://postgres:postgres@127.0.0.1:54329/rotra",
		"not postgres":  "http://127.0.0.1:54329/rotra_disposable_e2e",
		"lookalike":     "postgresql://postgres:postgres@127.0.0.1.evil.test:54329/rotra_disposable_e2e",
		"userinfo host": "postgresql://127.0.0.1:54329@db.example.com:54329/rotra_disposable_e2e",
	} {
		t.Run(name, func(t *testing.T) {
			c, err := FromEnv(lookup(on), url)
			if err == nil || c != nil {
				t.Fatalf("clock = %v, err = %v; want a refusal", c, err)
			}
		})
	}
}

func TestFromEnvAcceptsTheLocalThrowawayDatabase(t *testing.T) {
	for _, url := range []string{
		localDB,
		"postgres://postgres:postgres@localhost:54329/rotra_disposable_e2e?sslmode=disable",
	} {
		c, err := FromEnv(lookup(map[string]string{EnvVar: "1"}), url)
		if err != nil || c == nil {
			t.Fatalf("%s: clock = %v, err = %v", url, c, err)
		}
	}
}

func TestClockStartsAtRealTimeAndKeepsTicking(t *testing.T) {
	real := time.Date(2026, 11, 25, 9, 0, 0, 0, time.UTC)
	c := New(func() time.Time { return real })
	if got := c.Now(); !got.Equal(real) {
		t.Fatalf("Now = %v, want %v", got, real)
	}
	if err := c.Set(real.Add(3 * time.Hour)); err != nil {
		t.Fatal(err)
	}
	real = real.Add(time.Minute)
	if got, want := c.Now(), real.Add(3*time.Hour); !got.Equal(want) {
		t.Fatalf("Now = %v, want %v (virtual base plus the real time since)", got, want)
	}
}

func TestSetNeverGoesEarlierThanRealTime(t *testing.T) {
	real := time.Date(2026, 11, 25, 9, 0, 0, 0, time.UTC)
	c := New(func() time.Time { return real })
	if err := c.Set(real.Add(-time.Second)); err != ErrBeforeRealTime {
		t.Fatalf("err = %v, want ErrBeforeRealTime", err)
	}
	if !c.Now().Equal(real) {
		t.Fatal("a refused Set must leave the clock alone")
	}
	if err := c.Set(real); err != nil {
		t.Fatalf("setting to exactly real time: %v", err)
	}
}

func TestResetGoesBackToRealTime(t *testing.T) {
	real := time.Date(2026, 11, 25, 9, 0, 0, 0, time.UTC)
	c := New(func() time.Time { return real })
	_ = c.Set(real.Add(24 * time.Hour))
	c.Reset()
	if !c.Now().Equal(real) {
		t.Fatalf("Now = %v after Reset, want %v", c.Now(), real)
	}
}

func control(t *testing.T, h http.Handler, method, body string) (int, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(method, "/clock", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out
}

func TestControlEndpointSetsAndResets(t *testing.T) {
	real := time.UnixMilli(1_800_000_000_000).UTC()
	c := New(func() time.Time { return real })
	h := c.Handler()

	code, out := control(t, h, http.MethodGet, "")
	if code != 200 || out["nowMs"].(float64) != 1_800_000_000_000 || out["offsetMs"].(float64) != 0 {
		t.Fatalf("GET = %d %v", code, out)
	}
	code, out = control(t, h, http.MethodPost, `{"nowMs": 1800003600000}`)
	if code != 200 || out["nowMs"].(float64) != 1_800_003_600_000 || out["offsetMs"].(float64) != 3_600_000 {
		t.Fatalf("set = %d %v", code, out)
	}
	code, _ = control(t, h, http.MethodPost, `{"nowMs": 1799999999999}`)
	if code != http.StatusConflict {
		t.Fatalf("earlier than real time = %d, want 409", code)
	}
	code, _ = control(t, h, http.MethodPost, `{"nowMs": "soon"}`)
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("bad nowMs = %d, want 422", code)
	}
	code, _ = control(t, h, http.MethodPost, `not json`)
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("bad json = %d, want 422", code)
	}
	code, out = control(t, h, http.MethodPost, `{"reset": true}`)
	if code != 200 || out["offsetMs"].(float64) != 0 {
		t.Fatalf("reset = %d %v", code, out)
	}
	if code, _ = control(t, h, http.MethodDelete, ""); code != http.StatusMethodNotAllowed {
		t.Fatalf("DELETE = %d, want 405", code)
	}
	req := httptest.NewRequest(http.MethodGet, "/other", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("other path = %d, want 404", rec.Code)
	}
}

func TestServeBindsOnlyTheLoopbackAddress(t *testing.T) {
	c := New(time.Now)
	if err := Serve(context.Background(), c, "0.0.0.0:0"); err == nil {
		t.Fatal("a non-loopback address must be refused")
	}
	if err := Serve(context.Background(), c, "db.example.com:9193"); err == nil {
		t.Fatal("a host name must be refused")
	}
}

func TestServeAnswersUntilTheContextEnds(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := ln.Addr().String()
	_ = ln.Close()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- Serve(ctx, New(time.Now), addr) }()
	var resp *http.Response
	for i := 0; i < 100; i++ {
		resp, err = http.Get("http://" + addr + "/clock")
		if err == nil {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("Serve returned %v after the context ended", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Serve did not return")
	}
}
