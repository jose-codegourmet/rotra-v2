# AGENTS.md — `@rotra/api-proxy`

> Nested entry for `packages/api-proxy`. Root: [`/AGENTS.md`](../../AGENTS.md) · Decision: B-51 in
> [backend open decisions](../../docs/backend/open-decisions.md).

Server-only code the three apps' `proxy.ts` files and pages share. One file per concern, one `exports`
subpath per file, no barrels, no dependency beyond `server-only`.

| Import | Exports |
|---|---|
| `@rotra/api-proxy/go-forward` | `forwardToGo`, `goApiEnabled`: forward moved `/api/*` paths to Go |
| `@rotra/api-proxy/go-read` | `readFromGo`: server-side read of a Go GET endpoint (null on 404, throws otherwise) for pages that read a service directly |
| `@rotra/api-proxy/pass` | `verifyAccessPass`, `accessCookieName`: verify the Go access pass (`rotra-<aud>-access`, EdDSA/Ed25519, WebCrypto only) for the `proxy.ts` navigation guard; key set from `GET {ROTRA_GO_API_URL}/api/auth/keys` behind the proxy secret, cached 10 minutes, an unknown `kid` refetches at most once a minute. Result: valid, well-signed but `expired` (the page may load, the client refreshes on its first API call), or not ok (`invalid`, or `unavailable` when the key set cannot be fetched: that request redirects to `/login`, the next one retries). Needs the Node.js runtime, the default for `proxy.ts` in Next 16 |
| `@rotra/api-proxy/data-mode` | `dataMode`, `MOCK_COOKIE_PREFIX`: the `ROTRA_DATA_MODE` check |

`forwardToGo(request, app)` takes the calling app (`club`, `player`, `admin`), drops any client-sent
`X-Rotra-App` and sets it itself next to the proxy secret; Go trusts the header only for that reason.
`readFromGo(path, { app })` does the same for a server-side read (the Player claim page).

## Moved areas: prefixes and exact paths

`ROTRA_GO_MOVED_AREAS` is a comma-separated list. A plain entry (`/api/auth`) is a whole-segment prefix. An entry that starts
with `=` is one exact path, with `*` standing for exactly one non-empty segment: `=/api/register/*/google` matches
`/api/register/<clubId>/google` and nothing else (not `/api/register`, `/api/register/google` or a deeper path). Use it for a
route whose siblings stay in TypeScript. It cannot tell `/api/register/{clubId}` from `/api/register/google` (same segments),
so the password registration cannot move on its own. Tests: `pnpm --filter @rotra/api-proxy test` (`node --test`, no new
dependency; not part of `make check`).

## Checking Go sign-in locally

`ROTRA_GO_MOVED_AREAS` must include `/api/auth` and `/api/claim` (whole-segment prefixes), for example
`/api/stream/ticket,/api/auth,/api/claim,=/api/register/*/google`, with `ROTRA_GO_API_URL` and `ROTRA_PROXY_SECRET` set.
With Go in front, `proxy.ts` never calls Supabase and guards pages with the pass cookie only.

Stay on TypeScript on purpose until their tracks land, so they fail after a Go sign-in:

- Admin `/api/password-reset-requests` (until track 8, the Admin password and email writes).
- Every signed-in `/api/me/*` and the other Route Handlers that still read a Supabase session (until
  track 7). They answer 401 or refuse, which is expected, not a bug.

Device list endpoints (contract only, not built yet): [device-list-contract.md](../../docs/backend/device-list-contract.md).
