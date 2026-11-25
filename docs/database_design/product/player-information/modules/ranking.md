# Assessments, rank evidence, and rolling eligibility

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Status:** Proposed persistence model, **partly superseded on November 11, 2026** by [D-2026-11-11-05](../../../../mvp/decisions/2026-11-11.md#d-2026-11-11-05): rank is a **rating by wins, weighted by who you beat**, projected from the game facts. The assessment-vote model below (`club_assessments` as rank input, the 70/30 `RankingPolicyVersion` weights) no longer feeds the rank; the level for the night stays a per-session value and seeds a new player's starting rating only. The rating constants are chosen in #247; this file is redrawn there.

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

**Match page id** (proposal, November 25, 2026, [mockup log](../../../../mockup-changes/2026-11-25-player-match-page.md)): the public match page `/matches/[matchId]` is keyed by the match's own id, the `match_id` every participant's `player_match_facts` row already shares (unique `(match_id, session_player_id)`). A game in a player's history must carry that shared id, never a per-player row id, so every player in the match links to the same page. The page reads all facts with that `match_id` for the court, and the same session's earlier facts per participant for **Before this game**. No new table.

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

## Skill rank refresh

Accepted assessments, valid finalizations, confirmed identity changes and ageing boundaries can trigger skill-rank projection work. The recent three-month match count describes skill-rank progress. The period leaderboards use their own read below.

## Period leaderboards

The owner approved computing both periods from recorded matches on November 18, 2026 (#918). Use the existing tables without a migration or stored places.

- Read `player_match_facts` for full participation in singles and doubles standard matches. Require a completed match decision and a committed finalization of a completed session. A win is agreement between the participant's team and the winning team. A score and a published session page are optional.
- Use `played_at` for both periods. Bound each request to the beginning of the previous requested period through the request time. The earliest boundary needed for all three profile places is January 1 of the previous year. Late uploads change the previous standings on the next read.
- Credit the identity recorded at finalization or a confirmed, unrevoked `player_history_attributions` link scoped by club and saved player. Count each participant fact once per identity. Include a global unclaimed player only when exactly one active `club_players` row links them to a club. Legacy club-only records have no shared identity until the identity work in #900.
- Apply the same calendar and ordering function as mock mode. Periods start at midnight in Asia/Manila on January 1, the first of the month or Monday. Order by wins, exact win rate, nickname (full name fallback) and stable player ID. One qualifying match, including a loss, establishes a place.
- Publish up to 50 rows. Movement compares with the previous top 50. Mask private names before search or serialization. Return other players' places only within the public top 50, subject to profile visibility. The verified owner's period read can also report their place below 50, their wins and the wins at place 50.

Business source: [ranking](../../../../business_logic/product/player-information/modules/ranking/README.md).
