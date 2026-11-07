# Workstream — Ranking

**Last verified:** 2026-11-07 (code audit of `main` @ `51abb94f`; traced, not run) · [MVP hub](../README.md)

Paths: `db/` = `packages/db/`. Rules: [ranking module](../../business_logic/product/player-information/modules/ranking/README.md).

## Goal

Finalize the ranking/fairness/award rules and connect recalculation; saved ranking settings alone do not
calculate ranks (#247).

## In scope

Rank formula (blend, normalization, ties), rank projection on finalization, recalculation on policy
change, ageing / window rechecks, guest history attribution recompute, session awards, queue fairness
and generation weights.

## Out of scope / deferred

- Anything beyond the ranking work agreed under the scope freeze ([D-04](../decisions.md#d-2026-11-07-04)).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Saved ranking settings | implemented | `RankingPolicyVersion` (`db/prisma/schema/admin/configuration.prisma:29`), append-only versions | #402 closed |
| Rank projection job on finalization | partially connected | `apps/queue/src/app/api/sessions/[sessionId]/finalization/route.ts:34,57` → `driveFinalizationJobs` (`db/src/player/projections.ts:343`) → `recomputeRank` (`:65`); `APPROVED_RANK_ALGORITHMS` empty (`:24`) → rank, level null, `leaderboardEligible: false` | #247 open |
| Rank formula (blend, normalization, ties) | not implemented | Business doc says the engine is not specified (`ranking/README.md:3,39,70`) | #247 open (blocked) |
| Recalculation on policy change | not implemented | `schedulePolicyRecalculation` (`projections.ts:409`) has no caller | #247 |
| Ageing / 3-month window rechecks | not implemented | `scheduleAgeingJobs` (`projections.ts:383`) has no caller; no cron in `.github/workflows` | #247 |
| Guest history attribution recompute | not implemented | `confirmHistoryAttribution` (`projections.ts:419`) has no caller | #244, #246, [D-03](../decisions.md#d-2026-11-07-03) |
| Session awards (Most Improved, Off Day…) | partially connected | `writeResultSnapshot` uses `awardBaseline`, labeled `prototype-reference` (`projections.ts:22`); runs in real mode with an unapproved formula | #247 open |
| Queue fairness / generation | unknown | `packages/data/src/real/autoQueue.ts` exists; not audited; drafts use prototype weights ([queue.md](queue.md)) | #247 |
| Retry failed projection job | not implemented (owner path) | `retryProjectionJob` (`:371`) has no caller; finalization `retryFailed` path exists (`route.ts:57`) | Ticket: needed |

## Remaining work

- [ ] Owner approval of formula, normalization, ties, sparse data, award evidence. Ticket: #247 (open, blocked).
- [ ] After #247: approved algorithm version, eligibility, recalculation on policy save, ageing scheduler, attribution recompute. Ticket: needed.
- [ ] Decide whether `prototype-reference` awards ship in MVP. Ticket: #247.
- [ ] Owner path to retry a failed projection job. Ticket: needed.

## Related decisions

- [D-2026-11-07-03](../decisions.md#d-2026-11-07-03) — confirmed guest identity feeds history attribution.
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — ranking work is in the frozen scope.

## Blocking open decisions

- #247 F07.6 ranking/award/fairness math, ties, precision, retroactivity — blocks all rank, leaderboard and award approval.
- [Database open decisions](../../database_design/product/open-decisions.md) (numerical model, window length and timezone, award evidence) · [business open decisions](../../business_logic/product/open-decisions.md).
- Hub open questions 11, 12.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] The owner approves the rank, award and fairness rules (#247 closed).
- [ ] Finalization writes approved ranks; leaderboard eligibility follows the approved rules.
- [ ] Saving ranking settings triggers recalculation per the approved rules.
- [ ] Awards in MVP use an approved formula or are ruled out by the owner.
