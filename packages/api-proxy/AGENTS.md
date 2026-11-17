# AGENTS.md — `@rotra/api-proxy`

> Nested entry for `packages/api-proxy`. Root: [`/AGENTS.md`](../../AGENTS.md) · Decision: B-51 in
> [backend open decisions](../../docs/backend/open-decisions.md).

Server-only code the three apps' `proxy.ts` files and pages share. One file per concern, one `exports`
subpath per file, no barrels, no dependency beyond `server-only`.

| Import | Exports |
|---|---|
| `@rotra/api-proxy/go-forward` | `forwardToGo`, `goApiEnabled`: forward moved `/api/*` paths to Go |
| `@rotra/api-proxy/data-mode` | `dataMode`, `MOCK_COOKIE_PREFIX`: the `ROTRA_DATA_MODE` check |
