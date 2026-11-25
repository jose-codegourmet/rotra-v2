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

Environment: copy [.env.example](.env.example) (placeholders only; the guide is `docs/backend/environment-setup.md`). The Google
sign-in variables are optional and never stop the API from starting.

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
- `POST /api/stream/ticket` returns `{ticket, expiresInSeconds, topics}`: 32 random bytes, valid 60 s, single use, held in memory
  (one instance, B-43; a restart only drops tickets that were 60 s from expiring). The optional JSON body `{"topics": [...]}` names
  what the screen wants to watch; `topics` in the answer is what it may (see Live updates below). 60 tickets a minute per client
  IP, then 429; a signed-in viewer is never counted.
- `GET /stream?ticket=...` is Server-Sent Events: the ticket is consumed on open (used, expired, forged or missing: 401, nothing
  streamed), a `: ping` comment every 20 s, open until the client leaves or draining starts. More than 50 open streams from one
  client IP (the IP the ticket was issued to, seen through the proxy), or 3,000 in all, are refused with 429; signed-in screens are
  never limited.
- `ROTRA_ALLOWED_ORIGINS` (optional): comma-separated exact origins (`https://queue.rotra.club,http://localhost:9000`; no `*`,
  path or trailing slash, validated at start). CORS headers are sent on the two stream routes only, only for a listed origin.
- `ROTRA_QUEUE_ORIGINS` (optional): same format; the Queue app origins that may call the credentialed Player stats read
  (`GET /api/rtr-ids/{rtrId}/stats` with cookies). Separate from `ROTRA_ALLOWED_ORIGINS`; unset means no Queue origin is allowed.
- `ROTRA_VISITOR_RECEIPT_SECRET` (optional, a secret; set in Railway, never in the repo): the key of the receipt a Queue visitor holds for
  their join request, an HMAC-SHA256 of `join-request:<requestId>` (base64url, no padding) kept in the httpOnly cookie
  `rotra_join_request`. Use the same value the Next apps used, so a receipt issued before the move still matches. It is read as given (no
  trimming), compared in constant time and never logged. Unset: `POST /api/public-sessions/{slug}/join-request` answers 503
  `unavailable` once the body and the slug are valid, and `GET .../my-request` answers 503 only for a request holding a cookie, as the Route
  Handlers do.

## Google sign-in (D-2026-11-16-01)

`internal/auth/google` is Google sign-in for players: the OpenID Connect code flow done by the API itself (standard library only), the
routes `/api/auth/google/{start,callback,outcome,link,unclaimed}` and `/api/claim/{token}/google`, and (in `internal/auth/register`)
`/api/register/{clubId}/google`. Every route is 404 while the `player_google_sign_in` flag is off. Variables, all three or none:
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_BASE` (the Player app's origin; Google returns to
`<base>/api/auth/google/callback`, which the Player app's proxy forwards). Without them Continue with Google answers 503. The tests use a
fake Google (`internal/auth/google/fake_test.go`), and a `google` golden captured from the TypeScript for what it decides before the
provider; nothing has run against real Google. Design and differences: [setup](../../docs/backend/google-sign-in-setup.md#in-the-go-api-track-go-sign-in-catch-up).

## Housekeeping (B-34)

`internal/housekeeping` runs hourly (`HOUSEKEEPING_INTERVAL`, default 1h) under a Postgres advisory lock, in batches of
`HOUSEKEEPING_BATCH_SIZE` (1000), and stops with the process. Tracks register their cleanup with `Register(...)`
(helper: `housekeeping.OlderThanDays`). Retention env with B-34 defaults: `RETENTION_LIVE_UPDATE_EVENTS_DAYS` 7,
`RETENTION_AUTH_EVENTS_DAYS` 90, `RETENTION_AUTH_SESSIONS_DAYS` 90. The cleanups registered: live-update events (`liveupdates.Cleanup`),
`auth_events`, ended `auth_sessions`.

## Live updates (track live-updates; B-25, B-26, B-34, B-43, B-44, B-48, B-49, B-50)

`internal/liveupdates`. Every Go write that changes what a screen shows adds one row to `live_update_events` in its own transaction
(`writes.InTx` adds what the route noted just before it commits; commands note through `liveupdates.Note(ctx, club, session, players...)`;
routes are classified in `liveupdates/routes.go`, and `TestEveryWriteRouteIsClassified` fails for a write route that is not). A session
write locks the session row first, so a session's event ids follow commit order (B-49), and stores the new id as
`queue_sessions.latest_event_id`, the session's snapshot version (B-25). `NOTIFY live_updates` is sent in the same transaction.
The migration must be applied before this API build runs: every noted write adds its event, so a database without the table fails them.

The publisher (`Publisher`) reads events in transaction order (B-48: `(xact_id, id) > cursor` and `xact_id < pg_snapshot_xmin(...)`),
nudged by `LISTEN` on one direct connection (`DATABASE_DIRECT_URL`) and by a 1 s poll, and pushes to the in-memory `Hub` (topics
`session:<id>`, `club:<id>`, `player:<id>`, `admin`). Set `DB_IDLE_IN_TX_TIMEOUT` (default 5 s): an idle transaction holds every ping back.

Wire format (the frontend codes against this):

- `POST /api/stream/ticket` body `{"topics":["club:<uuid>","session:<uuid>","player:<uuid>","admin","public-session:<slug>"]}` (at most 16) with the
  app's proxy headers and cookie. Answer `{"ticket","expiresInSeconds":60,"topics":[accepted names]}`; a topic the viewer may not read is dropped,
  and none accepted answers 401 (a visitor), 403 (signed in) or 404 (a public page that does not exist). An expired pass answers the distinct 401
  `expired`: refresh once and ask again. A visitor sends no pass and may only ask for `public-session:<slug>`.
- `GET <api>/stream?ticket=<ticket>[&lastEventId=<id>]` (or the `Last-Event-ID` header). Events, each `id: <xact_id>:<id>` where it moves the position:
  - `event: ready`, `data: {"position":"<xact_id>:<id>"|null}`: the screen is live from here. Order on a connection: zero or more `changed` with no
    `id` (the catch-up, only when a last id was sent), then `ready` with the `id`, then live `changed` events with their ids. A screen that sent no last id
    re-reads once on `ready`.
  - `event: changed`, `data: {"topic":"<name as asked>","version":<event id>|null,"kind":"<kind>"}`: the topic moved. `version` is the session's new
    snapshot version (re-read with `?minVersion=<version>`); on a club or player topic it is the newest event id. `kind` is one of `session`,
    `roster`, `courts`, `queue`, `requests`, `payments`, `results`, `finalization`, `club`, `players`, `inventory`, or `changed` (several things moved, or a
    `public-session:` topic: a visitor's message never names the kind). After `Last-Event-ID`: one `changed` per topic that moved, with no `id`. An id
    older than the kept events (7 days), unreadable, or with too much to tell: `changed` on every topic with `"version":null`.
  - `event: reconnect`, `data: {"retryMs":1000..5000}` and a `retry: <ms>` line: the server is closing (deploy, or the screen fell behind); wait that long, ask
    for a new ticket (tickets are single use, so a native `EventSource` retry gets 401) and reopen with the last id.
- `GET /api/public-sessions/{slug}?minVersion=<n>` returns a copy at version `n` or newer; that answer (only) carries `X-Rotra-Snapshot-Version`.

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

The club's trusted hosts and a Queue Session's hosts (`hosts.go`, and the two GETs in `internal/signedin/queue_hosts.go`, D-2026-11-22-01) have the golden `hosts`
(cases from `gen-writes-queue-hosts-cases.py`; the generated ids of an added host are redacted). The setup save's `hostClubPlayerIds` and the freeze of a
finished session's hosts are not in Go yet.

Preparation, courts and the roster (`session_prep.go`, `courts.go`, `roster_ops.go`) and the club's own writes (`club_writes.go`) are in the same package.
Their goldens are `prep`, `rosterops` and `club` (cases from `gen-writes-queue-prep-cases.py`, `gen-writes-queue-ops-cases.py` and
`gen-writes-queue-club-cases.py`). Capture `prep` with `TZ=UTC` (see its generator). `session_rules.go` holds the preparation rules no other code
shares (the repeating dates and their clashes, the court window, the late start's new end). Create, edit and start check the entitlement before the
transaction and lock the session without the live-session exception: use `lockedSession(..., false, ...)` for such a command, `inSession` for the
rest. A session a command changed is read again with `txn.reload` / `txn.touch` (the queries return no row because pgx cannot scan an enum array).

Join and match requests (slice 2.2) are in the same package. `join_requests.go`, `match_requests.go`, `court_fill.go`, `drop_outs.go` and
`club_player_details.go` are the Queue Master's side (goldens `requests` and `details`); `match_store.go` is the match store the match control
slice builds on (`matchCommand`, `matchContext`, `appendMatch`, `putOnCourt` with its court and player holds, `autoFill` as `fillCourts`).
`public_session.go` is the signed-in Player's side (golden `pubjoin`, app `player`): every route checks the paired Queue origin and the JSON
content type first, answers the CORS preflight, then the Player pass in write mode and the Google deadline gate, and locks the session without
the club entitlement check (`inPageSession`). The match request rules no other code shares are in `internal/rules/matchrequest` (a grid captured from
the real TypeScript: `testdata/tools/capture-matchrequest-lineup.test.mjs`). A step of the write harness may send `headers` (an Origin, or a
Content-Type left out with ""), and the capture runs the Player's Route Handlers on the Player origin (`ROTRA_CAPTURE_ORIGIN`).

The Player's sign-out (`POST /api/public-sessions/{slug}/sign-out`, golden `signout`) is `signin.SignOut(deps, player)` behind the same origin and content type checks (`Deps.PlayerSignOut`; nil leaves the route out). The capture has no Supabase, so its provider call is a stand-in and the golden does not compare `Set-Cookie`; `signout_test.go` pins the revoked session and the cleared cookies.

Match control and the queue (slice 2.3, `match_control.go`, `match_queue.go`, golden `match`, cases from `gen-writes-queue-match-cases.py`):
Put on court, Start, Send back, Move, Swap, Replace player, Substitute, Team wins / No result and Invalid, Add match (manual, selection,
suggested, reviewed drafts), edit, remove and reorder a waiting match, Auto queue and Regenerate. `matchCommand` runs each one; `loadMatch` reads a
match with its segments, holds, court usage and decision (`matchRow`); `decide` is the shared end of Team wins and Invalid (a contradicting
decision commits its `sync_conflicts` row and then answers 409, which is why `decide` returns a marker and fails after the command). The
server generates lineups from `n` with `internal/queuewrites/queuegen` (a port of queue.rules.ts and autoQueue.rules.ts; TypeScript-only rules
until the device sends its own lineups, BL-3), pinned by a grid captured from the real TypeScript (`capture-queuegen.test.mjs`). `fillCourts` is
the one Auto Queue fill: the court commands now call it too. Session-level commands (slice 2.4, `session_finish.go`, golden `finish`): Set end
time, Extend, Cancel session and Mark session invalid; Publish results (`results_publication.go`, golden `publish`, with a result snapshot the cases seed; Session done, which writes it, is below). The Player's match request, its cancel and Move me to the waitlist are in
`public_match_request.go` (golden `pubmr`). A race whose winner is not decided is in `race_match_test.go`.

Session done (slice 4, `finalization.go`, `finalization_jobs.go`, `finalization_snapshot.go`, `finalization_rank.go`, golden `finalize`, cases from
`gen-writes-queue-finalize-cases.py`): `POST /api/sessions/{id}/finalization` commits the one finalization row, the facts, the session summaries and the
jobs in one transaction under the session lock, then drives the jobs in the same request (result snapshot, player history, player rank: claimed with
SKIP LOCKED, each in its own transaction, three rounds, a failed job backs off 30 s doubling to an hour and stops after eight attempts). `GET` of the same
path is the signedin package's route; it runs the same drive first through `signedin.Deps.DriveFinalization` (`queuewrites.DriveFinalization`, wired in
`cmd/api/main.go`). The rules are `internal/rules/sessionresult` (standings, awards, the award baseline; the expected win chance reads the captured
`10 ** y` table), pinned by the Vitest cases, a captured grid of 140 sessions and the finalize golden. The finalization sign-off list is in the plan's
deviations log. The job list of the status and the belowMinimum warning are compared as sets (`Step.Unordered`: a path whose array order the TypeScript does not
decide). Rank notifications are keyed by the job id; the cases seed a rank row, a ranking policy that takes effect late (a trigger the
case file installs) and job rows in every state to reach each branch of the drive.

The Queue visitor routes (`visitor.go`, goldens `visitor` and `visitor-nosecret`, cases from `gen-writes-queue-visitor-cases.py`): Request to join
(`POST /api/public-sessions/{slug}/join-request`) and My request (`GET .../my-request`), registered for the Queue app (`X-Rotra-App: club`) with no
pass. The receipt cookie is written as Next writes it (`Path`, `Secure` when the request came over https, `HttpOnly`, `SameSite=lax`); the capture
reads Next's own serializer through the `next/headers` stub, and a step may send a `cookie`.

Money (slice 3.1, `inventory.go`, `payments.go`, `money_cost.go`, golden `money`, cases from `gen-writes-queue-money-cases.py`, capture with `TZ=UTC`): the
club's inventory (add or edit, stock step, remove), the payment batch, the amount received and Mark all paid, and the cost estimate that Create
session and Edit preparation save beside the session. The pure rules are in `internal/rules/sessioncost` and `internal/rules/payment` (the signed-in
reads call them too). `normalizeCost` reads the estimate of a form body as JavaScript does (`jsValue` keeps undefined apart from null; a wrong shape is
the TypeError the TypeScript answers with a 500), pinned by `jsnumber.golden.json`. A mark is deleted and inserted, never updated. The stock step's
`updated_at` is the database clock; every other stamp is the application clock. The money sign-off list is in the plan's deviations log.

## Golden files

`internal/http/testdata/*.golden.json` are captured from the TypeScript Route Handler sources, not written by hand.
After changing `packages/db/src/service/{errors,serialize,handler}.ts` on purpose:

```bash
source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-golden.mjs
```

## Local signing key

The sign-in track generates a throwaway key at `apps/api/.local/` on setup. That folder and `*.pem` are git-ignored.
The real key exists only in Railway. A pre-commit hook (`gitleaks`, `brew install gitleaks`) and the Secrets workflow guard against leaks.
