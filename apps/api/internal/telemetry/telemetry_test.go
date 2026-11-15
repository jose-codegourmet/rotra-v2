package telemetry_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/telemetry"
)

func env(m map[string]string) func(string) (string, bool) {
	return func(k string) (string, bool) { v, ok := m[k]; return v, ok }
}

const parentTrace = "4bf92f3577b34da6a3ce929d0e0e4736"

func serve(t *testing.T, tr *telemetry.Tracing, path string, headers map[string]string) {
	t.Helper()
	h := tr.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(204) }))
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	h.ServeHTTP(httptest.NewRecorder(), req)
}

func TestSpanExportedWithServiceNameAndJoinedParent(t *testing.T) {
	exp := tracetest.NewInMemoryExporter()
	tr, err := telemetry.New(context.Background(), env(nil), telemetry.WithExporter(exp))
	if err != nil {
		t.Fatal(err)
	}
	serve(t, tr, "/v1/things", map[string]string{"traceparent": "00-" + parentTrace + "-00f067aa0ba902b7-01"})
	spans := exp.GetSpans() // the in-memory exporter clears itself on Shutdown, so read first
	if err := tr.Shutdown(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(spans) != 1 {
		t.Fatalf("want 1 span, got %d", len(spans))
	}
	s := spans[0]
	if s.SpanContext.TraceID().String() != parentTrace || s.Parent.SpanID().String() != "00f067aa0ba902b7" {
		t.Fatalf("trace context from the incoming header was not joined: trace=%s parent=%s", s.SpanContext.TraceID(), s.Parent.SpanID())
	}
	var svc string
	for _, kv := range s.Resource.Attributes() {
		if string(kv.Key) == "service.name" {
			svc = kv.Value.AsString()
		}
	}
	if svc != "rotra-api" {
		t.Fatalf("service.name = %q, want rotra-api", svc)
	}
}

func TestServiceNameEnvOverrides(t *testing.T) {
	exp := tracetest.NewInMemoryExporter()
	tr, err := telemetry.New(context.Background(), env(map[string]string{"OTEL_SERVICE_NAME": "rotra-api-staging"}), telemetry.WithExporter(exp))
	if err != nil {
		t.Fatal(err)
	}
	serve(t, tr, "/x", nil)
	spans := exp.GetSpans()
	_ = tr.Shutdown(context.Background())
	if len(spans) != 1 {
		t.Fatalf("want 1 span, got %d", len(spans))
	}
	for _, kv := range spans[0].Resource.Attributes() {
		if string(kv.Key) == "service.name" && kv.Value.AsString() != "rotra-api-staging" {
			t.Fatalf("got %s", kv.Value.AsString())
		}
	}
}

func TestProbesAreNotTraced(t *testing.T) {
	exp := tracetest.NewInMemoryExporter()
	tr, _ := telemetry.New(context.Background(), env(nil), telemetry.WithExporter(exp))
	serve(t, tr, "/healthz", nil)
	serve(t, tr, "/readyz", nil)
	n := len(exp.GetSpans())
	_ = tr.Shutdown(context.Background())
	if n != 0 {
		t.Fatalf("probes must not create spans, got %d", n)
	}
}

func TestDisabledWithoutEndpoint(t *testing.T) {
	tr, err := telemetry.New(context.Background(), env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if tr.Enabled() {
		t.Fatal("must be disabled when no OTLP endpoint is set")
	}
	serve(t, tr, "/x", nil) // still serves
	if err := tr.Shutdown(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestDisabledByStandardSwitch(t *testing.T) {
	tr, err := telemetry.New(context.Background(), env(map[string]string{
		"OTEL_EXPORTER_OTLP_ENDPOINT": "http://127.0.0.1:4318", "OTEL_SDK_DISABLED": "true",
	}))
	if err != nil || tr.Enabled() {
		t.Fatalf("OTEL_SDK_DISABLED=true must disable: %v", err)
	}
}

func TestEnabledWithEndpoint(t *testing.T) {
	for _, k := range []string{"OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"} {
		tr, err := telemetry.New(context.Background(), env(map[string]string{k: "http://127.0.0.1:1"}))
		if err != nil || !tr.Enabled() {
			t.Fatalf("%s: enabled=%v err=%v", k, tr != nil && tr.Enabled(), err)
		}
		serve(t, tr, "/x", nil)
		// Nothing listens on the endpoint: shutdown must give up within its context, not hang.
		ctx, cancel := context.WithTimeout(context.Background(), 2_000_000_000)
		_ = tr.Shutdown(ctx)
		cancel()
	}
}
