# Workflow — backend

> [AGENTS.md](../AGENTS.md) and [ways-of-working.md](../docs/ways-of-working.md) stay the authority.
> This adds the Conductor task loop for backend tracks.

## Where work is tracked

- **Tracks** (`conductor/tracks/`) hold the plan for a piece of backend work.
- **GitHub issues** stay the tracker v2 uses ([ways-of-working §3](../docs/ways-of-working.md#3-how-work-is-organised)).
  Each track phase becomes one ticket (or a few) under the Go API epic; the plan links them.

## Testing

- **Go (`apps/api`): strict TDD.** Red → green → refactor for every task. Decided by the owner for the
  backend; it doesn't change the frontend test rule (AGENTS.md §7: no new screen, component or
  Storybook tests).
- **Ported endpoints: characterization first.** Pin the current Route Handler's behavior (status,
  JSON, errors, edge cases) in Go tests, then implement until they pass.
- **Rules: shared cases.** A Go rule passes every `@rotra/rule-cases` case before it's used.
- **Database tests** run against a real Postgres (a throwaway container), never mocks.
- **Coverage:** at least 80% on new Go packages.
- **TypeScript parts** of a track (rule-cases moves, env-gated rewrites, fetcher switches) follow v2:
  `make check` once at the end, plus the manual verification written into the PR.

## Task loop

1. Pick the next `[ ]` task whose dependencies are done; mark it `[~]`.
2. Go: write the failing test → make it pass → refactor ([go style](code_styleguides/go.md)).
3. Record any deviation from the spec in the plan's Deviations Log.
4. Mark `[x]`. The plan update goes in the same commit as the work (one commit = one ticket).

## Checks before merging

| | Go | TypeScript |
|---|---|---|
| Gate | Backend CI green: `scope`, `go vet`, `go test -race -cover`, `go build`, golangci-lint, govulncheck | `make check` passed on the last commit |
| Scope | Backend paths + docs only (Backend CI `scope` job); frontend parts go in a separate PR | as usual |

A red Backend CI means Railway doesn't deploy. That's the gate.

## Commits

- Conventional Commits, **short**: one subject line, a short body only if needed.
- **No `Co-Authored-By` trailer.**
- Scopes: `api`, `rule-cases`, `infra` (Railway IaC), `db` (migrations), `docs`, `conductor`.
- Fixes fold into their ticket commit (`git commit --fixup`, autosquash), as ways-of-working says.

## Stop and ask

Before a phase that touches: a migration on the shared database, auth or sessions, money or ranking
rules, a new dependency, a production deploy or a data copy. Same list as
[ways-of-working §10](../docs/ways-of-working.md#10-stop-and-ask).
