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

## Proxy secret, stream tickets, CORS (B-30, B-41, B-43)

- `ROTRA_PROXY_SECRET` (optional): the value each app's `proxy.ts` sends in header `X-Rotra-Proxy-Secret`. Compared in
  constant time. `X-Real-IP` / `X-Forwarded-For` is trusted only with a correct secret; otherwise the connection address is
  the client IP (`httpapi.ClientIPFrom(ctx)`). Without a correct secret every path except `/healthz`, `POST /api/stream/ticket`
  and `GET /stream` answers 404. If the variable is unset, no request is trusted, so only those three answer (including
  local dev: set a secret and send the header to reach other routes).
- `POST /api/stream/ticket` returns `{ticket, expiresInSeconds}`: 32 random bytes, valid 60 s, single use, held in memory
  (one instance, B-43; a restart only drops tickets that were 60 s from expiring). 60 tickets a minute per client IP, then 429.
- `GET /stream?ticket=...` is Server-Sent Events: the ticket is consumed on open (used, expired, forged or missing: 401, nothing
  streamed), a `: ping` comment every 20 s, open until the client leaves or draining starts.
- `ROTRA_ALLOWED_ORIGINS` (optional): comma-separated exact origins (`https://queue.rotra.club,http://localhost:9000`; no `*`,
  path or trailing slash, validated at start). CORS headers are sent on the two stream routes only, only for a listed origin.
- `ROTRA_QUEUE_ORIGINS` (optional): same format; the Queue app origins that may call the credentialed Player stats read
  (`GET /api/rtr-ids/{rtrId}/stats` with cookies). Separate from `ROTRA_ALLOWED_ORIGINS`; unset means no Queue origin is allowed.

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

## Shared queue rules (bucket 1)

`internal/rules/{match,courts,roster,courtfill}` are the Go copy of the shared queue rules, on `internal/rules/model`
types, behind the versioned registry `rules.For(version)` (B-22; version 1 is today's behavior). Every JSON case in
`packages/rule-cases/cases/v1` runs through `rules.For(1)` (`internal/rules/rulestest`, strict input decoding).
Names in standings are ordered by `internal/rules/collate`, a documented en-US subset (see its package comment;
regenerate its table with `node testdata/gen.mjs`).

`cmd/ruleswasm` exports the rules to JavaScript as `globalThis.rotraRules` (JSON string in, JSON string out; a panic
comes back as `{"ok":false,...}`). It builds only for WebAssembly:

```bash
GOOS=js GOARCH=wasm go build -trimpath -ldflags="-s -w" -o rules.wasm ./cmd/ruleswasm
```

The committed build lives in `packages/rules-wasm/wasm/`. After any change under `internal/rules` or `cmd/ruleswasm`
run `make wasm` and commit the result; `make check` fails while the recorded fingerprint is stale.

## Writes (go-writes-admin-player)

A ported POST, PATCH or DELETE is pinned against the real TypeScript, answer for answer and row for row, with the
write harness: `internal/writetest` (Go replay) and `testdata/tools/capture-writes-base.mjs` (capture). Shared code
for write routes is `internal/writes` (service error, JSON body reader, `RequireRevision`, `InTx`); a write package
such as `internal/adminwrites` (the Admin app) or `internal/playerwrites` (the Player's own writes: `/api/me/*`, `/api/account/contact-change`) registers its routes on the shared `signedin.Router` through `signedin.Deps.Routes`. `internal/contactwrites` is the contact-change `submit` both of them call.

To add a write group (for example `PATCH /api/clubs/{clubId}`):

1. Write `<group>.cases.json` in the package's `testdata/` (the field list is the doc of `internal/writetest`): one
   seed SQL file that also resets itself, `snapshot` specs (the tables the write touches, the audit events, the player
   notifications; a unique ORDER BY, bigints as text), and cases made of steps. A step is one request, or `parallel`
   (a race). Name generated values with `redact` (response paths, snapshot columns), never by shape.
2. Add a `test(...)` to a `capture-writes-<app>.test.mjs` (or copy `capture-writes-admin.test.mjs`; add the file to
   `include` in `vitest.capture.config.mjs`) and run it; the command is at the top of the file. It reseeds for every
   case, runs the real Route Handler and service, and writes `<group>.golden.json`.
3. Add a Go test that calls `writetest.Replay(t, "testdata", "<group>", build)`; `build` registers the package's routes.
   Watch it fail, then write the routes. A race whose answer depends on timing is not pinned in the golden file: test
   what always holds in a test of its own (`internal/adminwrites/flags_race_test.go`, with `Env.DoAll`).
4. Where Go must differ (the TypeScript answers 500), set `goExpects` and `allow500` on the step and log it in the plan.

Groups so far (`internal/adminwrites`): `flags` (`admin.seed.sql`), and four that share `clubs.seed.sql` and one capture file,
`capture-writes-clubs.test.mjs`, whose cases are generated by `testdata/tools/gen-writes-admin-clubs-cases.py`: `ranking`
(`POST /api/ranking-settings`), `licenses` (`POST /api/clubs/{clubId}/licenses`), `clubname` (`PATCH /api/clubs/{clubId}`,
the name review) and `clubs` (`POST /api/clubs`). That capture also mocks the club login of the provider (there is no
Supabase here): Go makes the sign-in identity itself, so those columns are out of the shared snapshot and tested in
`clubs_test.go`. `Deps.Hasher` is the sign-in hasher, passed in `cmd/api/main.go`.

The capture fakes `Date` only: Prisma stamps `@default(now())` and `@updatedAt` times with the
application clock, so those are pinned, and Go writes them from its own clock (`Deps.Now`). Only truly generated values
(an audit event id) are redacted.

## Queue writes (go-writes-queue)

`internal/queuewrites` serves the Queue app's writes (`X-Rotra-App: club`) on the same shared router, behind the club pass
check in write mode. It holds the helpers every later Queue write is built on: `inSession` (lock the club's session row, check
access: an entitlement, or a live session a licence term started), `rosterCommand` (that, then the open states, then the tail every
roster change has: close the match requests that name someone no longer present, bump the session revision, recompute a calculated
minimum), `requireRevision` / `requireState`, `derivedID` and the roster building blocks `place`, `promoteWaiter`, `assessEntry`,
`createClubPlayer`, `clubPlayerForProfile`. The roster read and DTOs are exported from `signedin` (`queuewrites_export.go`) so a
write answers what the read sends.

The offline contract has no table of its own: a command repeats safely in its own way (`club_assessments.source_operation_id` plus rows
whose ID is derived from the operation id; a request decision on the request's status), so a retry recomputes its answer and still
bumps the session revision. `GET /api/sync` is read-only (see `internal/signedin/queue_sync.go`).

Cases that need more than one request use the multi-step fields of the write harness (`internal/writetest/doc.go`): `now` moves the clock
before a step, `snapshot` pins the rows after it, `save` and `{{name}}` pass a generated id to a later step, and the case file's
`snapshotDiff` pins only the rows the steps changed. `testdata/tools/gen-writes-queue-cases.py` writes the cases, the capture is
`testdata/tools/capture-writes-queue.test.mjs` (same recipe as the groups above), and `queue.seed.sql` is the seed. A race whose winner is
not decided is tested in `race_test.go`, not pinned.

## Golden files

`internal/http/testdata/*.golden.json` are captured from the TypeScript Route Handler sources, not written by hand.
After changing `packages/db/src/service/{errors,serialize,handler}.ts` on purpose:

```bash
source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-golden.mjs
```

## Local signing key

The sign-in track generates a throwaway key at `apps/api/.local/` on setup. That folder and `*.pem` are git-ignored.
The real key exists only in Railway. A pre-commit hook (`gitleaks`, `brew install gitleaks`) and the Secrets workflow guard against leaks.
