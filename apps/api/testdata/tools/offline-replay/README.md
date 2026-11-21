# Offline-replay check (go-writes-queue, task 5.1)

Replays a recorded offline Queue Session through the real device outbox (`packages/data/src/outbox/replay.ts`) into the Go
API, over the same path the beta stack uses: Queue app (real data mode) → `proxy.ts` forwarding (`ROTRA_GO_API_URL`,
`ROTRA_GO_MOVED_AREAS`, `ROTRA_PROXY_SECRET`) → Go API → Postgres. It exists to catch what the per-route goldens cannot: ids the
device invents offline, the order of replay, the lost-reply retry with the same `operationId`, and a real stale revision.

Local only. Everything it starts is throwaway: a docker Postgres on `127.0.0.1:55439` (database `rotra_disposable_replay`), a Go
API on `:8089` and the Queue app on `:9200`. Secrets (the club password, the proxy secret, the visitor secret, the Go signing key)
are generated on each `up`, kept in a `0600` file under `$TMPDIR/rotra-offline-replay`, and never printed. Nothing reads `.env`
files, Railway, Vercel or Supabase, and the scripts refuse a database that is not local and named `rotra_disposable*`.

## Run

Needs docker, Go, Node 24 (`nvm use`), `openssl` and Google Chrome (Playwright drives the installed Chrome; no browser download).

```bash
apps/api/testdata/tools/offline-replay/run.sh all      # up, test, down (down also on failure)
```

or step by step: `up`, `test` (repeat with `reseed` between runs), `down`.

## What it does

1. `seed/main.go` loads `internal/queuewrites/testdata/queue.seed.sql`, makes the club account `smash` able to sign in through
   Go, and moves the live session ("Live Now") to the present.
2. `replay.mjs` signs in through the UI, downloads the session (it flips the session to prepared in the database only for the
   download card, then back), turns on the app's own "Simulate offline" switch, and records, by clicking: add a new player, a
   presence change, make a match with that new player, put it on a court, start it, finish it, and a payment mark. The four
   match steps are recorded with the browser's network really cut as well (Playwright `context.setOffline`).
3. It goes online, drops the first answer to the match result (the request reaches Go, the reply does not reach the browser),
   lets the outbox retry, and checks: outbox empty, no conflict, the same `operationId` sent twice and saved once (one decision row), the device copy
   equals the server's reads, and the rows in the database.
4. Round 2 makes a second match offline and, while it replays, sends that match back to the queue from "another device" so the start
   meets a stale revision; it checks that exactly that command is held for Q-CONFLICT.
5. It lists every `/api/*` path the browser used and checks each is under the moved prefixes (set by `run.sh`, the exact list in
   `docs/architecture.md` plus the other prefixes the Queue pages call).

## History

The first run (2026-11-21) found that an offline session could not be recorded and replayed in real mode. It passed only with a temporary patch to `packages/data`; the fixes landed in ticket #999 and the patch was removed. The findings are in the track plan's deviations log and backlog row BL-18.

What the check cannot do: only the match steps of round 1 run under a real network cut (the rest uses the app's own switch),
and no real phone is involved; it covers one browser, the
club account and the Queue app only; device time and sent lineups (BL-2, BL-3), live-update events (BL-15), Move to waitlist
(BL-17) and the pass renewal after 15 minutes (B-28) are not part of it. When the sync dialog offers no Retry sync after the
dropped reply, the script retries by reconnecting, and says so.
