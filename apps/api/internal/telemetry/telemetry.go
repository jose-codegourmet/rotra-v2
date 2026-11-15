// Package telemetry sets up OpenTelemetry tracing (R5): service name rotra-api, OTLP over HTTP, and
// trace context taken from incoming headers so a trace started in an app continues here.
// Configuration is the standard OTEL_* environment; with no endpoint set tracing is off and costs nothing.
package telemetry

import (
	"context"
	"net/http"
	"strings"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// ServiceName is the default service.name; OTEL_SERVICE_NAME overrides it.
const ServiceName = "rotra-api"

// Tracing owns the tracer provider.
type Tracing struct {
	provider *sdktrace.TracerProvider // nil when disabled
}

// Option customises New (tests pass an in-memory exporter).
type Option func(*settings)

type settings struct {
	exporter sdktrace.SpanExporter
	sync     bool
}

// WithExporter replaces the OTLP exporter and forces tracing on; spans are exported synchronously.
func WithExporter(e sdktrace.SpanExporter) Option {
	return func(s *settings) { s.exporter, s.sync = e, true }
}

// New reads OTEL_* from lookup. Tracing is on when OTEL_EXPORTER_OTLP_ENDPOINT or
// OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is set and OTEL_SDK_DISABLED is not "true". Export is batched and
// asynchronous: an unreachable collector never slows or fails a request.
func New(ctx context.Context, lookup func(string) (string, bool), opts ...Option) (*Tracing, error) {
	var s settings
	for _, o := range opts {
		o(&s)
	}
	get := func(k string) string { v, _ := lookup(k); return strings.TrimSpace(v) }

	// Context joins even when export is off, so downstream code sees the caller's trace id.
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))

	if s.exporter == nil {
		if strings.EqualFold(get("OTEL_SDK_DISABLED"), "true") ||
			(get("OTEL_EXPORTER_OTLP_ENDPOINT") == "" && get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT") == "") {
			return &Tracing{}, nil
		}
		// otlptracehttp reads the endpoint, headers, timeout and compression from the standard env itself.
		exp, err := otlptracehttp.New(ctx)
		if err != nil {
			return nil, err
		}
		s.exporter = exp
	}

	name := ServiceName
	if v := get("OTEL_SERVICE_NAME"); v != "" {
		name = v
	}
	res, err := resource.New(ctx, resource.WithAttributes(attribute.String("service.name", name)), resource.WithFromEnv())
	if err != nil {
		return nil, err
	}
	processor := sdktrace.WithBatcher(s.exporter)
	if s.sync {
		processor = sdktrace.WithSyncer(s.exporter)
	}
	tp := sdktrace.NewTracerProvider(processor, sdktrace.WithResource(res))
	otel.SetTracerProvider(tp)
	return &Tracing{provider: tp}, nil
}

// Enabled reports whether spans are being recorded.
func (t *Tracing) Enabled() bool { return t.provider != nil }

// Shutdown flushes pending spans; it respects ctx so a dead collector cannot hold up the exit.
func (t *Tracing) Shutdown(ctx context.Context) error {
	if t.provider == nil {
		return nil
	}
	return t.provider.Shutdown(ctx)
}

// Middleware wraps next so each request (except the probes) is a server span continuing the caller's trace.
func (t *Tracing) Middleware(next http.Handler) http.Handler {
	if t.provider == nil {
		return next
	}
	return otelhttp.NewHandler(next, ServiceName,
		otelhttp.WithTracerProvider(t.provider),
		otelhttp.WithPropagators(otel.GetTextMapPropagator()),
		otelhttp.WithFilter(func(r *http.Request) bool { return r.URL.Path != "/healthz" && r.URL.Path != "/readyz" }),
		otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string { return r.Method + " " + r.URL.Path }),
	)
}
