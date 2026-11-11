import { registerOTel } from '@vercel/otel'

// OpenTelemetry traces (docs/observability.md). A no-op unless an OTLP endpoint is configured;
// the exporter reads the standard OTEL_EXPORTER_OTLP_* variables itself.
export function register() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return
  registerOTel({ serviceName: 'rotra-admin' })
}
