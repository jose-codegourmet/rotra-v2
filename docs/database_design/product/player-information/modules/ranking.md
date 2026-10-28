# Assessments, rank evidence, and rolling eligibility

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed persistence model. Ranking mathematics is deliberately unspecified beyond agreed weights and input rules.

## `skill_levels`

Fields: stable small integer/UUID `id`; unique text `code` (e.g. `intermediate_mid`); category Beginner/Intermediate/Advanced; band Low/Mid/High; unique `display_order` (0–8); display label (e.g. “Intermediate Mid”). No subdivision column.

Seed exactly nine levels: Low, Mid, High within each of Beginner, Intermediate and Advanced (decided October 26, 2026; the earlier 36 I–V subdivisions are dropped). If any data was captured on the old list, map each old subdivision to its band's level. Display order is an ordering only, **not proof of equal numerical spacing**. Numerical rating thresholds belong to a separately approved algorithm/version; do not turn ordinals directly into the 70/30 formula.

## `club_assessments`

| Field | Purpose |
|---|---|
| `id` | UUID PK, stable for offline capture |
| `club_id`, `club_player_id`, `session_id`, `session_player_id` | Scoped source: roster preparation, not unrestricted profile editing |
| `player_id_at_assessment` | Nullable link for guest/unresolved identity |
| `skill_level_id` | One of the nine levels |
| `supersedes_id` | Optional prior revision for provenance, same club/player scope |
| `source_operation_id` | Unique operation for idempotency |
| `assessed_at`, `received_at`, `accepted_revision` | Source time and server order/evidence |
| `actor_account_id`, `device_id` | Attribution possible under a shared club account |

Use a scoped composite FK for the selected roster assessment so an assessment for a different player or session cannot be selected. Handle initial cyclic insertion as documented in the Queue roster model.

Append new assessment evidence rather than rewriting the locked level used in a prior session. The roster points at its chosen assessment and copies the frozen full level.

For shared rank, select the **latest eligible assessment per club in the three-month window**, then give each contributing club one equal vote. Ten assessments at club A are not ten votes against one at club B. Confirm/refresh versus change must be an explicit assessment event, not inferred from reading a profile.

Index `(player_id_at_assessment, club_id, assessed_at DESC, accepted_revision DESC)` plus `(club_id, club_player_id, assessed_at DESC)`. Late uploaded assessments cannot replace newer ones solely because received later; the accepted assessment-time policy must address device-clock uncertainty before implementation.

Eligibility of assessments for no-shows/invalid sessions remains open. Do not invent rollback behavior; saved assessments already influence rank before Session done when accepted online. Earlier valid guest games must contribute after confirmed identity linkage (owner decision, October 28, 2026), subject to normal performance eligibility and original played dates. That decision does not independently settle historical assessment attribution or its eligibility rules.

## Match evidence

Read `player_match_facts` only from valid finalized sessions. Filter to full-participation standard matches. Preserve session-assigned levels and partner/opponent lineup context. Current global rank must not retroactively overwrite these snapshots.

Fun matches and outgoing/incoming mid-game substitutes do not supply long-term performance. Optional scores remain optional evidence. Winner-only games remain valid; the formula cannot silently treat absent scores as zero points.

## `player_rank_current`

One replaceable projection per player, with:

- Last computed/displayed skill level and nullable algorithm-specific numeric rank value.
- Provisional / established / needs-reassessment state, with an explanation code.
- Assessment component, performance component, input counts/evidence digest, and algorithm/configuration version.
- `window_start`, `window_end`, `calculated_at`, input watermark, and `next_recheck_at`.
- Recent full standard-match count, last valid played time, fresh-assessment/session evidence, and leaderboard eligibility.

A null component is **missing evidence**, not zero. The exact blend with no recent performance needs a decision. Preserve the previous displayed rank when marking Needs reassessment.

`ranking_policy_versions` is owned by Admin. Initial weights are 7000/3000 basis points and leaderboard threshold 10. The formula and label thresholds are separate from those configuration values.

Do not materialize an unexplained rank with no source version. Store enough calculation evidence to reproduce it from immutable facts; a bounded historical calculation log can be added if required, not an unrestricted duplicate warehouse.

## Refresh and public leaderboard

Trigger/coalesce rank projection work after accepted assessments, valid finalizations, approved identity changes where relevant, and configured ageing boundaries. Expiry of observations requires a timer or read-time freshness check even when no new games arrive.

The rolling leaderboard requires 10 eligible standard matches in three months by default, configurable in Admin. After three months without playing, preserve the visible old rank but hide leaderboard placement until a new valid session with fresh assessment and the match-count requirement are satisfied.

An index on `(leaderboard_eligible, numeric_rank DESC, player_id)` may support the final leaderboard once numerical ordering is approved. Index `next_recheck_at` for stale projections. Public reads must not present known-expired eligibility simply because a worker is behind; check projection freshness. There is no index predicate containing the current time.

Global tie order and atomic visibility of a multi-player recalculation are undecided. Local session standings use their separate wins/losses/head-to-head/name rules.

Business source: [ranking](../../../../business_logic/product/player-information/modules/ranking/README.md).
