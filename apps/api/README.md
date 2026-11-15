# apps/api: ROTRA Go API

Approved libraries only (every other library is a dependency decision): `pgx/v5` (pgxpool), the OpenTelemetry Go SDK
with the OTLP HTTP exporter and `otelhttp`, and `sqlc` as a dev tool (never in `go.mod`). Router is `net/http` ServeMux.
Go version is pinned in `go.mod` (`go 1.26.11`); with `GOTOOLCHAIN=auto` (the default) `go` downloads it on first use.

```bash
cd apps/api
go vet ./... && go test -race -cover ./... && gofmt -l .
DATABASE_URL=postgres://user:pw@127.0.0.1:5432/rotra go run ./cmd/api   # PORT, LOG_LEVEL, SHUTDOWN_TIMEOUT, DB_MAX_CONNS optional
```

Tests use a real Postgres: `DATABASE_URL_TEST` when set (CI service container), otherwise a throwaway `postgres:16-alpine`
started with `docker run` on a random localhost port and removed afterwards (`internal/testpg`). With neither, the
database packages print a SKIP line and pass. Each test creates its own database; `testpg.ApplyMigrations` runs the
Prisma migrations on it (with stub `anon`/`authenticated`/`service_role` roles, which Supabase provides in real life).

## sqlc

Pinned in `Makefile` (`SQLC_VERSION`, now v1.30.0); run `make sqlc` after editing `internal/db/queries/*.sql`. The generated
`internal/db/sqlcgen` is committed and depends only on pgx; `make sqlc-check` (run by Backend CI) fails on any diff.
`sqlc.yaml` reads the Prisma migrations directly (`migrations/*/migration.sql`, sorted by name = Prisma's apply order):
all 31 parse as plain SQL, no explicit file list needed.

## Tracing

OpenTelemetry via standard env, service name `rotra-api` (`OTEL_SERVICE_NAME` overrides). Off unless
`OTEL_EXPORTER_OTLP_ENDPOINT` (or `..._TRACES_ENDPOINT`) is set; `OTEL_SDK_DISABLED=true` forces off. Export is OTLP over HTTP
(`http/protobuf`). `/healthz` and `/readyz` are not traced. Incoming `traceparent` is continued.
Local: `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318` with the `otel-lgtm` stack.

## Housekeeping (B-34)

`internal/housekeeping` runs hourly (`HOUSEKEEPING_INTERVAL`, default 1h) under a Postgres advisory lock, in batches of
`HOUSEKEEPING_BATCH_SIZE` (1000), and stops with the process. Tracks register their cleanup with `Register(...)`
(helper: `housekeeping.OlderThanDays`). Retention env with B-34 defaults: `RETENTION_LIVE_UPDATE_EVENTS_DAYS` 7,
`RETENTION_AUTH_EVENTS_DAYS` 90, `RETENTION_AUTH_SESSIONS_DAYS` 90. No cleanup is registered yet: those tables do not exist.

- `internal/config`: environment loader, fails fast on missing `DATABASE_URL`.
- `internal/db`: pgx pool (`/readyz` pings it) and `sqlcgen` queries. `internal/telemetry`, `internal/housekeeping`, `internal/testpg`: see below.
- `internal/http`: router, request id, access log, `/healthz`, `/readyz`, graceful shutdown, error and JSON contracts.
- `internal/rulecases`: test helper that runs a Go rule over `packages/rule-cases/cases/v1/<area>/<rule>.json`.
- `internal/rules/<area>`: pure rules (see the rule map in the rule-cases spec).

## Golden files

`internal/http/testdata/*.golden.json` are captured from the TypeScript Route Handler sources, not written by hand.
After changing `packages/db/src/service/{errors,serialize,handler}.ts` on purpose:

```bash
source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-golden.mjs
```

## Local signing key

The sign-in track generates a throwaway key at `apps/api/.local/` on setup. That folder and `*.pem` are git-ignored.
The real key exists only in Railway. A pre-commit hook (`gitleaks`, `brew install gitleaks`) and the Secrets workflow guard against leaks.
