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
   presence change, make a match with that new player, put it on a court, start it, finish it, and a payment mark.
3. It goes online, drops the first answer to the match result (the request reaches Go, the reply does not reach the browser),
   lets the outbox retry, and checks: outbox empty, no conflict, the same `operationId` sent twice and saved once (one decision row), the device copy
   equals the server's reads, and the rows in the database.
4. Round 2 makes a second match offline and, while it replays, sends that match back to the queue from "another device" so the start
   meets a stale revision; it checks that exactly that command is held for Q-CONFLICT.
5. It lists every `/api/*` path the browser used and checks each is under the moved prefixes (set by `run.sh`, the exact list in
   `docs/architecture.md` plus the other prefixes the Queue pages call).

## Two TypeScript workarounds, and why

With the app as it is, an offline session cannot be recorded and replayed in real mode, with any backend. `offline-apply.patch`
holds the smallest fix for each bug; `run.sh up` applies it to the working tree and `down` reverts it (set
`ROTRA_REPLAY_NO_PATCH=1` to run the app as it is and see the failures). It is never committed here. When the fixes land in the
apps the patch stops applying and `run.sh` skips it.

1. `delay()` in `packages/data/src/mock/latency.ts` refuses every mock reducer in real mode, even inside the offline working
   state, so nothing reaches the outbox ("This part of ROTRA isn't connected to saved data yet.").
2. `realRequest` in `packages/data/src/real/client.ts` answers a session's GETs from the device copy while commands of that
   session wait, even during replay, so the replay's own fresh read of the queue shows the device's match id; the next command is
   rewritten to the server's id and fails "Match not available".

Both, and three smaller ones (the cleared "needs attention" flag, TanStack pausing mutations when the network is really cut, a
stale offline notice), are logged in the track plan's deviations log as TypeScript follow-ups.

What the check cannot do: it simulates offline with the app's own switch, not by cutting the network; it covers one browser, the
club account and the Queue app only; device time and sent lineups (BL-2, BL-3), live-update events (BL-15), Move to waitlist
(BL-17) and the pass renewal after 15 minutes (B-28) are not part of it. When the sync dialog offers no Retry sync after the
dropped reply, the script retries by reconnecting, and says so.
