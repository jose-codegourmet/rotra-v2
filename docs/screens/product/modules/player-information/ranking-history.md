# Global leaderboard, rank explanation, and game history

**Last verified:** 2026-10-28 for profile sync timing and confirmed guest-history linkage.

**Surfaces:** `P-LEADERBOARD`, `P-RANK-DETAIL`, `P-ELIGIBILITY`, `P-MATCH-HISTORY`.

**Source:** [ranking rules](../../../../business_logic/product/player-information/modules/ranking/README.md).

## P-LEADERBOARD — One overall ROTRA ranking

Public without sign-in. Rows show global position, name/nickname, optional avatar, full skill label, and a link to the correct profile. No city, club, national, world-stage, or separate singles/doubles filters in v1.

Pagination or progressive loading is a proposed presentation choice for scale, not an excuse to truncate the ranking. Keep ordering stable within a coherent refreshed result. Search, if included, searches this public ranking; it is not a hidden contact search or new discovery product.

Eligibility help states the configured recent completed standard-match threshold, initially 10, within the last three months. Fun games, invalid games/sessions, and partial games do not count. Threshold text must use the current Admin configuration, not a hardcoded ten after changes.

States: loading, no eligible players, fetch failure, refresh in progress, stale/cached data, and a profile not appearing due to eligibility. Never populate empty standings with demo people or treat ineligible as last place.

## P-RANK-DETAIL — Explain the shared rank

Explain the two inputs in plain language:

- Current default 70%: each club's latest assessment within the last three months, with equal weight per club.
- Current default 30%: eligible match performance in the same window, accounting for assigned levels and partner/opposition context; optional scores add evidence.

Use configured weights if changed. Do not publish raw invented numerical components when the underlying formula is unresolved. Global rank is not simply total wins or average category ordinal.

Explain that each club can assign its own local level and that the operator's local judgment controls pairings. Their roster assessment can update shared rank on acceptance/sync; game-performance updates follow valid Session done. Neither is dependent on public slide sharing.

Whether individual clubs' assessments are publicly itemized is undecided. The explanation can describe the method without exposing unapproved club-by-club details or private operator notes.

## P-ELIGIBILITY — Progress and reassessment

For the signed-in owner or permitted public explanation, show actual eligible completed standard matches in the current window and required threshold. Do not count lifetime games toward a rolling requirement.

Below threshold: profile and provisional rank may remain visible, but no overall position. Fun-game local counts cannot inflate this progress.

Three months without play: retain previous label with **Needs reassessment**, remove overall position, and explain return requires a fresh club assessment plus a completed new session and the rolling match threshold. One return session does not waive the threshold.

Define missing/stale calculations as pending, not zero or Beginner. Exact calendar/window boundaries and recalculation behavior are unresolved and must be settled before publishing precise cutoff dates.

## P-MATCH-HISTORY — Read-only recorded games

Show only official records from valid finalized sessions for a linked player. Each supported row can show date, club/session, format, teams/opponents permitted by visibility policy, result, and final score **if supplied**. A missing score is displayed as “Winner recorded; score not entered,” not 0–0.

No Edit result, dispute/void, add score later, or reconstruct-game action. Those old workflows are outside v1's immutable result rule.

Separate club-local fun-game history from long-term performance counting. Whether fun/partial games appear in the public history list and exactly which opponent details are public remain open. Do not hide them from the club's retained operational record or silently claim they contributed to rank.

After a guest's identity is confirmed and linked, include their earlier valid games in personal history and ranking under the existing eligibility/window rules (owner decision, October 28, 2026). A name match alone is insufficient. Show processing truthfully until attribution/recalculation completes; use original game dates and count each game once. Confirmation evidence and mistaken-link handling remain open. Invalid sessions/games do not appear as official wins, losses, or played games; fun/partial-game public visibility remains a separate open detail.

If a public session page expires/deletes, preserve player history with a truthful unavailable-link state. Do not render broken link navigation as if history vanished.

## Acceptance examples

- Nine recent standard games plus twenty fun games still fails a threshold of ten.
- Old lifetime games outside the window do not count toward current eligibility.
- Updating weights changes explanatory copy only when the corresponding configured calculation is in effect.
- Deleting a club's public page leaves the player's retained official record intact.
