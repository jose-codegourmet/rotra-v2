# apps/api: ROTRA Go API

Standard library only for now; every library is a dependency decision (see the foundation track).
Go version is pinned in `go.mod` (`go 1.27.4`); with `GOTOOLCHAIN=auto` (the default) `go` downloads it on first use.

```bash
cd apps/api
go vet ./... && go test -race -cover ./... && gofmt -l .
DATABASE_URL=postgres://user:pw@127.0.0.1:5432/rotra go run ./cmd/api   # PORT, LOG_LEVEL, SHUTDOWN_TIMEOUT optional
```

- `internal/config`: environment loader, fails fast on missing `DATABASE_URL`.
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
