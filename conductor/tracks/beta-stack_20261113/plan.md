# Plan: Side-by-side beta stack

**Track ID:** beta-stack_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #873 (one issue for the whole track, under epic #869).

## Phase 1: Rewrites (TypeScript, frontend PR)

- [x] **1.1** Env-gated forwarding in each app's `proxy.ts` (B-30; shared helper `@rotra/db/proxy/go-forward`)
- [x] **1.2** `make check`; verify the current project is unchanged
- [ ] **1.3** Move `go-forward` and `data-mode` from `packages/db` to the new `packages/api-proxy` (B-51), no behavior change; update the three `proxy.ts` and the pages' imports. Before go-sign-in 4.1

## Phase 2: Local check (replaces the beta project and beta data phases, moved to staging-verification on 2026-11-17)

- [x] **2.1** Local Queue app → local Go API → local Postgres; results below (2026-11-17)

## Phase 4: Stream test

- [x] **4.1** Stream ticket route (through `proxy.ts`) and a minimal Go stream endpoint on the API domain (B-41)
- [x] **4.2** CORS for the app domains on the stream route (done in Go, tested; checked locally 2026-11-17). The hour-long run on staging moved to staging-verification R3

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-16 | 1.1 | `proxy.ts` forwarding instead of `next.config` rewrites | B-30 replaced B-05; rewrites can't add the secret header | Done in `proxy.ts` |
| 2026-11-16 | 2.1, 2.2, 3.1, 3.3, 4.2 (hour test) | Left open | Infrastructure and data copy are stop-and-ask; no Vercel tool, Supabase MCP unauthenticated | Owner decision needed |
| 2026-11-16 | 4.1 | Go ticket route `POST /api/stream/ticket`, stream `GET /stream`; tickets in memory | One instance (B-43), 60s lifetime | Add the ticket path to `ROTRA_GO_MOVED_AREAS` on beta |
| 2026-11-16 | 4.1 | Unset `ROTRA_PROXY_SECRET` also 404s `/readyz` | B-30 allows only `/healthz` and the ticket route | Health tests send the secret |
| 2026-11-17 | 2.x, 3.x, 4.2 (hour test) | Vercel project, data copy and live stream test moved to staging-verification | B-52: test locally during the move; live once, after every area is in Go | Done |

## Local check, 2026-11-17

Queue app (`pnpm dev`, port 9000, mock data mode) with `ROTRA_GO_API_URL=http://127.0.0.1:8080`, `ROTRA_GO_MOVED_AREAS=/api/stream/ticket` and a test `ROTRA_PROXY_SECRET`; Go API built from `main` on 8080 with `ROTRA_ALLOWED_ORIGINS=http://localhost:9000`; throwaway `postgres:16-alpine` on 5433.

| Check | Result |
|---|---|
| Ticket through `proxy.ts` (`POST /api/stream/ticket`) | 200, 60 s ticket |
| Stream on Go with the ticket and `Origin: http://localhost:9000` | 200 `text/event-stream`, `Access-Control-Allow-Origin` echoed |
| Same ticket again / forged ticket | 401 / 401 |
| Unlisted origin | no CORS header |
| Go `/readyz` without / with the secret | 404 / 200 |
| `/api/stream/ticket-x` (whole-segment match) | not forwarded (Go never saw it) |
| Protected page in Go mode | 307 to `/login` |
| Go stopped | 503 `unavailable` at once |
| Go accepting but never answering | 503 `unavailable` after 10.0 s |
| SIGTERM with a stream open | stream closed cleanly, process exited at once |

Not covered locally (staging-verification): the client IP Vercel sets (locally a client can send its own `X-Forwarded-For`, which Vercel overwrites); the stream reconnect hint and spread on deploy (B-44, built in live-updates; the minimal stream sends none yet); `/readyz` failing during the draining time; Vercel function limits and logs; cookies across the beta subdomains.
