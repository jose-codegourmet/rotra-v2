# @rotra/rule-cases

JSON only: no code, no scripts. Cases for the **bucket 1** (shared) queue rules; see the
[track spec](../../conductor/tracks/rule-cases_20261113/spec.md).

```text
cases/v<n>/<area>/<rule>.json    one file per rule; area = match | courts | roster | courtfill
schema/rule-case.schema.json     JSON Schema for a rule case file
schema/command-case.schema.json  JSON Schema for a command case file (go-writes-queue writes these)
```

## Rule case file

```json
{
  "kind": "rule",
  "rule": "canPlace",
  "version": 1,
  "cases": [{ "name": "…", "now": 1794564000000, "input": {}, "expected": null }]
}
```

- Money in integer minor units, ids as strings, times as epoch milliseconds.
- `now` (epoch ms) is on every case whose rule reads the clock. No shared rule uses random numbers.
- `expected` is exactly what today's TypeScript returns, as JSON (a `Map` is written as `[key, value]` pairs).

## Command case file

`{ kind: "command", command, version, cases: [{ name, before, args, operationId, now, expected: { after } | { rejected } }] }`

## Who reads it

- `@rotra/data` Vitest (`src/rule-cases/`) runs every rule case against the TypeScript rules.
- `@rotra/schema` Vitest (`src/rule-cases.test.ts`) checks every file against the schema, and that the
  committed JSON Schema files match the Zod shapes in `@rotra/schema/rule-cases`.
- Go tests read it through the `rulecases` helper (track phase 4).

**Go copy pending.** None now: every rule with cases has its Go copy (`GoCopyPending` in `apps/api/internal/rulecases` and `GO_COPY_PENDING` in `packages/rules-wasm/test/rulesWasm.test.ts` are empty). A new rule written in TypeScript first lists itself there until its Go copy lands.

Editing a case: change the JSON in the same PR as the rule change (`v1` is edited in place until the swap).
