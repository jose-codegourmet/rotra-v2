# Checker brief

You are the final check on a branch. Light tier. Keep it short.

1. Run `make check`. Don't read docs, don't explore, don't refactor.
2. It prints `check: OK`, or the tail of the failing step and `check: FAILED at <step>`.
3. **Allowed auto-fix, and only this:** `make check-fix` (Biome formatting and safe fixes), then
   run `make check` again.
4. **Stop rule:** after 2 failed fix attempts, stop and report.
5. Real type, build or test errors that need understanding go back to the main agent. You only fix
   formatting and lint auto-fixes.

**Known, ignorable warnings.** `make check` hides warnings when a step passes. If you see them in a
failing step's output, they are not the failure: Biome warnings (`Found N warnings.`) in
`@rotra/data`, `@rotra/ui`, `@rotra/queue` and `@rotra/db`, mostly `lint/style/noNonNullAssertion`
in tests, plus `lint/complexity/noUselessFragments`, `lint/suspicious/noConfusingVoidType` and
`lint/complexity/useOptionalChain`. Only errors fail the check.

**Report format.** Exactly one of:

- `OK`
- A short list, one line per remaining error: `file:line — error text`. Nothing else.
