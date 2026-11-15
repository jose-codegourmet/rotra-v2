package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
		_, _ = w.Write([]byte("x"))
	})
}

func TestRequestIDGeneratedAndEchoed(t *testing.T) {
	var seen string
	h := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = RequestIDFrom(r.Context())
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))

	got := rec.Header().Get("X-Request-Id")
	if !regexp.MustCompile(`^[0-9a-f]{32}$`).MatchString(got) {
		t.Fatalf("generated id %q", got)
	}
	if seen != got {
		t.Fatalf("context id %q != header %q", seen, got)
	}
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, httptest.NewRequest("GET", "/", nil))
	if rec2.Header().Get("X-Request-Id") == got {
		t.Fatal("ids must differ per request")
	}
}

func TestRequestIDKeepsCallerValueWhenSafe(t *testing.T) {
	h := RequestID(okHandler())
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Request-Id", "abc-123_DEF.9")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("X-Request-Id") != "abc-123_DEF.9" {
		t.Fatalf("got %q", rec.Header().Get("X-Request-Id"))
	}
}

func TestRequestIDReplacesUnsafeValue(t *testing.T) {
	for _, bad := range []string{"has space", "new\nline", strings.Repeat("a", 65), "semi;colon", "ünï"} {
		h := RequestID(okHandler())
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("X-Request-Id", bad)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Header().Get("X-Request-Id") == bad {
			t.Errorf("unsafe id %q was kept", bad)
		}
	}
}

func TestRequestIDFromEmptyContext(t *testing.T) {
	if RequestIDFrom(context.Background()) != "" {
		t.Fatal("no id expected")
	}
}

func TestAccessLogIsStructuredWithRequestID(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&buf, nil))
	h := RequestID(AccessLog(log)(okHandler()))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/things?secret=1", nil))

	var line map[string]any
	if err := json.Unmarshal(buf.Bytes(), &line); err != nil {
		t.Fatalf("log line is not JSON: %q", buf.String())
	}
	if line["request_id"] != rec.Header().Get("X-Request-Id") {
		t.Errorf("request_id %v", line["request_id"])
	}
	if line["method"] != "GET" || line["path"] != "/things" || line["status"] != float64(http.StatusTeapot) {
		t.Errorf("fields %v", line)
	}
	if _, ok := line["duration_ms"]; !ok {
		t.Error("duration_ms missing")
	}
	if strings.Contains(buf.String(), "secret") {
		t.Error("the query string must not be logged")
	}
}

func TestAccessLogDefaultStatus200(t *testing.T) {
	var buf bytes.Buffer
	h := AccessLog(slog.New(slog.NewJSONHandler(&buf, nil)))(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/", nil))
	if !strings.Contains(buf.String(), `"status":200`) {
		t.Fatalf("%s", buf.String())
	}
}

func TestRecoverTurnsPanicIntoInternalError(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&buf, nil))
	h := RequestID(Recover(log)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom secret") })))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != 500 || !strings.Contains(rec.Body.String(), `"internal"`) {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "boom") {
		t.Error("panic detail leaked to the response")
	}
	if !strings.Contains(buf.String(), "request_id") {
		t.Error("panic should be logged with the request id")
	}
}
