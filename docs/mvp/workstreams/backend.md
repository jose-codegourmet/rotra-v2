# Workstream — Backend decisions & infrastructure

**Last verified:** 2026-11-07 (code audit of `main` @ `51abb94f`; traced, not run) · [MVP hub](../README.md)

## Goal

Close the remaining open design decisions where they block implementation (#241 and the
[database open decisions](../../database_design/product/open-decisions.md)), and keep the platform able
to run the MVP in real mode.

## In scope

Next.js apps, shared packages, Prisma/Supabase services and the manual GitHub Actions deployment (see
[architecture](../../architecture.md) and the [root README](../../../README.md#production-deployments));
real-mode switch; scheduled jobs; decision gates #243–#248 under [F07 #241](https://github.com/jose-codegourmet/rotra-v2/issues/241).

## Out of scope / deferred

- Product features themselves (see the other workstream pages).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Real-mode switch | implemented (opt-in) | Client `NEXT_PUBLIC_ROTRA_DATA_MODE=real` (`packages/data/src/real/mode.ts:9`), server `ROTRA_DATA_MODE=real` (`packages/db/src/auth/data-mode.ts:10`); default `mock` (`packages/db/.env.example:10`) | — |
| Production deployment | implemented (manual) | `.github/workflows/deploy.yml`: Actions → Deploy production → `main` only; env pulled from Vercel | #389 closed (hosted signed-in verification) |
| Production data mode | unknown | Whether production sets `real` is not in the repo | Ticket: needed (or owner confirms) |
| Mock fallback in real mode | implemented | Unwired fetchers throw `NotConnectedError` (`packages/data/src/mock/store.ts:207,229`, `mock/latency.ts:18`) | #386 (tracking) |
| Finalization projection worker | partially connected | In-request worker (`packages/db/src/player/projections.ts`) | #243 open (worker design) |
| Scheduled jobs (license lapse, retention, ageing) | not implemented | `refreshLapsedEntitlements`, `runRetentionSweep`, `scheduleAgeingJobs` have no caller; no cron in `.github/workflows` | Ticket: needed (MVP scope: open question 13) |
| Offline sync services | partially connected | `packages/db/src/queue/sync.ts:165-629`, no route ([queue-offline.md](queue-offline.md)) | #246 open |
| RLS on public tables | not implemented | RLS disabled on 55 public tables; `anon` can execute `rotra_next_player_sequence()` (database open decisions, F07.34 gaps) | #387 (migration sign-off) |

## Remaining work

- [ ] Confirm production sets `ROTRA_DATA_MODE` / `NEXT_PUBLIC_ROTRA_DATA_MODE=real`. Ticket: needed (or owner confirms).
- [ ] Scheduler for license-lapse refresh, retention sweep and ageing jobs. Ticket: needed — confirm MVP scope.
- [ ] Close the decision gates that block MVP work: #243 (worker), #244 (auth/claim/contacts), #245 (storage rules), #246 (offline), #247 (ranking), #248 (public projections/retention). Ticket: existing gates.
- [ ] RLS / `anon` grant fix. Ticket: #387.

## Related decisions

- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — offline boundaries (sync design, #246).
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — offline mandatory; online-only launch not approved.

## Blocking open decisions

- [Database open decisions](../../database_design/product/open-decisions.md): auth provider configuration for club username login, email verification on claim, password policy, interrupted-device conflicts, `match_no` allocation, finalization with active games, and the F07.34 / #396 gap tables.
- Decision gates #243–#248 under [#241](https://github.com/jose-codegourmet/rotra-v2/issues/241); #381 club username identity.
- [Business open decisions](../../business_logic/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 1, 13, 14.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] The environment used for the regression handoff and launch runs in real mode, confirmed by the owner.
- [ ] Every open decision that blocks an MVP ticket is decided and recorded in its source doc.
- [ ] Jobs the owner keeps in MVP scope have a runner.
