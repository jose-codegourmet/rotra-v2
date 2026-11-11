# Observability

**Last verified:** 2026-11-11 · Decision: [D-2026-11-11-01](mvp/decisions.md#d-2026-11-11-01)

The Queue, Player and Admin apps send **OpenTelemetry traces** over OTLP: to **Grafana Cloud** in
production and to a **local Grafana stack** during development. Telemetry is off unless
`OTEL_EXPORTER_OTLP_ENDPOINT` is set.

## What is instrumented

| App | File | Service name |
|---|---|---|
| Queue | `apps/queue/src/instrumentation.ts` | `rotra-queue` |
| Player Information | `apps/player/src/instrumentation.ts` | `rotra-player` |
| Admin | `apps/admin/src/instrumentation.ts` | `rotra-admin` |

Each file is the Next.js 16 `instrumentation.ts` convention: `register()` runs once per server
instance. It returns early when `OTEL_EXPORTER_OTLP_ENDPOINT` is empty, so nothing is loaded or
exported; otherwise it calls `registerOTel({ serviceName })` from `@vercel/otel`.

With it on, traces include what Next.js and `@vercel/otel` emit on the server:

- incoming requests (pages, Route Handlers, `proxy.ts`) and Next.js render spans;
- outgoing `fetch` calls, such as Supabase Auth requests, with trace context propagated.

Not instrumented: browser-side code, Prisma queries (no `@prisma/instrumentation`), metrics and logs.
Only traces are exported. The mockup service is static and has no telemetry.

## Environment variables

Standard OpenTelemetry variables, read by `@vercel/otel`'s OTLP exporter:

| Variable | Local | Production (Grafana Cloud) |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | `https://otlp-gateway-<region>.grafana.net/otlp` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | `http/protobuf` |
| `OTEL_EXPORTER_OTLP_HEADERS` | not needed | `Authorization=Basic%20<base64(instanceId:token)>` |

- `%20` is a URL-encoded space; `Authorization=Basic <base64>` with a plain space is parsed the same.
- Do not set `OTEL_SERVICE_NAME`: the Vercel project's env vars are shared by all services, and the
  service name comes from each app's `instrumentation.ts`.
- Placeholders are in [`packages/db/.env.example`](../packages/db/.env.example). Never commit a real token.
- `turbo.json` passes `OTEL_*` through to tasks (`globalPassThroughEnv`) without affecting the cache.

## Local stack

Needs Docker. [`docker-compose.observability.yml`](../docker-compose.observability.yml) runs
`grafana/otel-lgtm` (Grafana, Tempo, Loki, Prometheus and an OpenTelemetry Collector in one container).

1. `make observability-up` (ports: Grafana 3000, OTLP gRPC 4317, OTLP HTTP 4318).
2. In the app's own `.env.local` (for example `apps/queue/.env.local`), add:

   ```bash
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
   ```

3. Restart the app (`make dev-queue`) and open a few pages.
4. Open <http://localhost:3000> (sign in `admin` / `admin` if asked) → **Explore** → data source
   **Tempo** → **Search**, Service Name `rotra-queue` (or `rotra-player`, `rotra-admin`) → **Run query**.
5. `make observability-down` stops it. Data is not kept between runs.

Remove the variables (or leave the endpoint empty) to turn telemetry off again.

## Grafana Cloud (production)

For an owner without an account yet:

1. **Create a free account** at <https://grafana.com> → **Create free account**. Choose a stack name
   (for example `rotra`) and a region close to the Vercel functions. This creates a Grafana Cloud stack.
2. **Open the OTLP setup.** In the Grafana Cloud portal (**My Account**), on the stack, find the
   **OpenTelemetry** tile and click **Configure**. Inside the stack's Grafana you can also go to
   **Connections → Add new connection → OpenTelemetry (OTLP)**.
3. **Copy the endpoint and instance ID.** The page shows the **OTLP endpoint**
   (`https://otlp-gateway-<region>.grafana.net/otlp`) and the **Instance ID** (a number).
4. **Generate a token.** On the same page, **Generate now** (or **Create token**) under
   *Password / API Token*. Give it a name such as `rotra-vercel`. Copy it now; it is shown once.
5. **Build the header.** The page shows the ready `OTEL_EXPORTER_OTLP_HEADERS` line. By hand it is
   `Authorization=Basic%20` followed by the base64 of `<instanceId>:<token>`:

   ```bash
   printf '%s' '<instanceId>:<token>' | base64
   ```

6. **Set the variables in Vercel.** Vercel → the Services project (`rotra-v2-queue`) → **Settings →
   Environment Variables**, environment **Production**. Add `OTEL_EXPORTER_OTLP_ENDPOINT`,
   `OTEL_EXPORTER_OTLP_HEADERS` (mark it **Sensitive**) and `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`.
   All four services share them.
7. **Redeploy.** GitHub **Actions → Deploy production → Run workflow** on `main` (see
   [Production deployments](../README.md#production-deployments)); new env values apply only to a new
   deployment.
8. **Check.** Open queue.rotra.club, then in Grafana Cloud **Explore → Tempo** (the
   `grafanacloud-<stack>-traces` data source) search for Service Name `rotra-queue`.

**Vercel Hobby:** the apps export over OTLP directly from the functions, so no Vercel trace drain or
paid observability add-on is needed. If a Vercel tracing integration were ever configured,
`@vercel/otel` would send to it instead. Grafana Cloud's free tier has monthly trace volume and
retention limits; check the current ones on the stack's billing page.

To turn production telemetry off, delete `OTEL_EXPORTER_OTLP_ENDPOINT` in Vercel and redeploy.
