# Track specification: Shared rule-cases package

**Track ID:** rule-cases_20261113 · **Type:** chore · **Priority:** critical (order 1 of 12) · **Created:** 2026-11-13
**Depends on:** — · **Decisions:** D-2026-11-13-02, B-02 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Go can't take over a rule until it proves it gives the same answer as the TypeScript the device uses offline. This package holds the shared test cases. It's useful even before any Go code exists.

## Requirements

### R1: Package

`packages/rule-cases` (`@rotra/rule-cases`): JSON case files only, `cases/<area>/<rule>.json`, exposed as `exports` subpaths, no barrel file.

**Accepted when:**

- [ ] Package added with the D-2026-11-13-02 layout
- [ ] Root workspace and `turbo.json` know it; nothing else imports code from it

### R2: Case file shape

`{ rule, version, cases: [{ name, input, expected }] }`, money in integer minor units, ids as strings.

**Accepted when:**

- [ ] A JSON Schema file describes the shape
- [ ] Every case file validates against it

### R3: Move existing cases

Take the cases out of the server-enforced `*.rules.test.ts` files without changing what they test: session cost, payments, match and auto-queue rules, auto-fill, session result, ranking settings, license, club, money, phone, court window.

**Accepted when:**

- [ ] Each moved Vitest file reads its JSON and still passes
- [ ] Case counts match before and after the move
- [ ] Money and ranking cases unchanged; any change needs owner sign-off

## Split into two PRs

Backend CI's `scope` job rejects a change that mixes backend paths with frontend packages. So:

1. **Backend PR:** `packages/rule-cases` with the schema and the case JSON files (copied from the tests, unchanged values).
2. **Frontend PR:** the `packages/data` / `packages/schema` Vitest files switch to reading the JSON. Runs the frontend CI and `make check`.

## Scope

**In:** The package, schema and moved cases; Vitest reading the cases.

**Out:** Go runner (go-api-foundation); Changing any rule or case value.

## Testing

TypeScript only: no new tests beyond the moved cases; `make check` once at the end ([workflow](../../workflow.md)).
