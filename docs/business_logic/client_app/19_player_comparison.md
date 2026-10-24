# 19 — Player Comparison

## Overview

Any authenticated player can compare two players' public profiles side by side to see how they stack up across overall performance, skill ratings, and head-to-head history. The viewer does not have to be one of the two players being compared.

---

## 19.1 Access Points

| Entry Point | Description |
|-------------|-------------|
| Player profile button | A "Compare with…" button on any player's public profile opens a player search to select the second subject |
| Direct URL | `/compare/{player_a_id}/{player_b_id}` — shareable link, follows the sharing rules in `13_sharing.md` |

Player A and Player B are interchangeable. The same pair always resolves to the same canonical URL (lower UUID sorted first), so sharing either direction produces an identical page.

---

## 19.2 Comparison Sections

The comparison page is divided into five sections, each with its own visibility rules.

---

### Section A — Profile Snapshot

Always visible when both profiles are publicly accessible.

| Field | Notes |
|-------|-------|
| Display name | Shown as column headers |
| Profile photo | Avatar side by side |
| Playing level | System-overridden level is shown if anti-sandbagging has triggered (same rule as individual profile) |
| Ranking tier badge | EXP-based tier from `14_gamification.md` |
| EXP points | Total accumulated EXP |
| Joined date | When the player first logged in |

---

### Section B — Overall Performance

Respects the **≥ 5 scored matches** gate defined in `05_player_profile.md` §5.4. Applied independently per player.

| Stat | Description |
|------|-------------|
| Games played | Total completed, scored matches |
| Wins | Total match wins |
| Losses | Total match losses |
| Win rate | Wins ÷ Games played (%) |

If a player has fewer than 5 scored matches, each affected cell shows **"Not enough data"** for that player. The other player's values are unaffected.

---

### Section C — Head-to-Head Record

Derived on-demand from existing match history records. No minimum match count gate applies to this section — it displays as soon as at least one qualifying match exists. If no qualifying matches exist, the section shows **"No head-to-head matches yet"**.

#### C.1 — Opponents Record

Matches where Player A and Player B appeared on **opposing teams**.

| Field | Description |
|-------|-------------|
| H2H wins — Player A | Matches where Player A's team won |
| H2H wins — Player B | Matches where Player B's team won |
| Draws | Matches recorded as Draw |
| Total H2H matches | Sum of all three |
| H2H win rate | Each player's wins ÷ total H2H matches (%) |
| Last match | Date of the most recent qualifying H2H match |

#### C.2 — Partner Record

Matches where Player A and Player B appeared on the **same team**.

| Field | Description |
|-------|-------------|
| Wins together | Matches where their shared team won |
| Losses together | Matches where their shared team lost |
| Total matches as partners | Wins + Losses (draws excluded from win rate) |
| Partner win rate | Wins together ÷ Total matches as partners (%) |

#### C.2 Query Filters

Both C.1 and C.2 apply the following filters from the match record:

- `status = Complete` (not Voided, not In Progress, not Review Phase)
- `winner ≠ Unscored` (a scored result must exist)
- Both player IDs present across `team_a` and `team_b` combined

For C.1 (opponents): one player ID is in `team_a` and the other in `team_b`.
For C.2 (partners): both player IDs are in the same team array (`team_a` or `team_b`).

---

### Section D — Skill Rating

Respects the per-dimension **≥ 5 external ratings** gate from `06_skill_rating.md` §6.6 and the overall **≥ 5 scored matches** gate from `05_player_profile.md` §5.4. Applied independently per player per dimension.

| Element | Description |
|---------|-------------|
| Overall skill rating | Weighted rolling average (1–5, one decimal) for each player |
| Dual radar chart | Overlapping hexagonal spider chart with one axis per dimension; both players plotted on the same chart |
| Per-dimension table | Dimension name \| Player A score \| Player B score \| Leader indicator |

#### Dimension Table Columns

| Column | Value |
|--------|-------|
| Dimension | Attack / Defense / Net & Touch / Precision & Control / Athleticism / Game Intelligence |
| Player A score | Numeric (e.g. 3.8) or "Not enough data" |
| Player B score | Numeric or "Not enough data" |
| Leader | "A", "B", "Tied", or "—" if either is "Not enough data" |

On the radar chart, dimensions with fewer than 5 ratings for a player are plotted at zero and visually marked as incomplete (e.g. dashed outline). A legend note explains the missing data.

---

### Section E — Advanced Stats

Unlocked **per player independently** once that player has completed at least **20 matches** (see `05_player_profile.md` §5.5). If a player has not reached 20 matches, their column in this section shows **"Unlocks at 20 matches"** with their current match count.

| Stat | Description |
|------|-------------|
| Peak skill rating | Highest overall rating ever recorded |
| Rating trend | Ascending / Stable / Descending (last 10 matches) |
| Sessions attended | Count of distinct queue sessions |
| Clubs joined | Count of clubs ever joined (active + previously left) |
| Favourite club | Club where most matches were played |
| Best session | Session where win rate was highest |
| Most frequent opponent | Player most often faced |
| Toughest opponent | Opponent with the highest win rate against this player |

---

## 19.3 Visibility Rules

| Rule | Detail |
|------|--------|
| Public data only | Comparison surfaces only data that is already publicly visible on each player's individual profile |
| Per-player gating | Each stat gate (≥ 5 matches, ≥ 20 matches, ≥ 5 ratings per dimension) applies independently per player |
| Sandbagging flag | Never shown in the comparison view — restricted to Que Masters and Club Owners on individual profiles |
| Per-rater ratings | Never shown — only the aggregated dimension score is displayed, consistent with `06_skill_rating.md` §6.6 |
| H2H no gate | H2H section has no minimum match threshold; it appears as soon as any qualifying shared match exists |
| Match history scope | Comparison is always all-time, all-clubs — the match history filters from `12_match_history.md` §12.7 are not exposed on the comparison page |

---

## 19.4 Data Model Notes

H2H and partner records are **computed on-demand** from the existing match history. No separate stored aggregate is needed — the query is a filtered scan over match records for the two player IDs.

All data shown in the comparison view is already stored and accessible:

| Data | Source |
|------|--------|
| Basic stats (wins, losses, games played) | Player statistics aggregate (`05_player_profile.md`) |
| Win rate | Derived from basic stats |
| Skill rating (overall + per dimension) | Rolling weighted average (`06_skill_rating.md`) |
| H2H and partner record | Computed from match records (`12_match_history.md`) |
| Advanced stats | Derived from match history (`05_player_profile.md` §5.5) |
| EXP, tier | Gamification records (`14_gamification.md`) |

---

## 19.5 Sharing

A comparison URL (`/compare/{player_a_id}/{player_b_id}`) is shareable and generates an Open Graph card, consistent with `13_sharing.md`.

### OG Card Contents

| Field | Value |
|-------|-------|
| Title | "{Player A name} vs {Player B name}" |
| Description | Overall skill ratings and H2H summary (e.g. "3.7 vs 4.1 · A leads H2H 5–3") |
| Image | Both profile photos side by side with a "VS" divider |

The comparison URL does not expire and does not require authentication to view (the page itself is public-readable, consistent with how individual profiles are public).

---

## 19.6 Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Player A = Player B | Disallowed — UI prevents self-comparison; URL `/compare/{id}/{id}` redirects to the player's own profile |
| One or both players not found | 404 page shown |
| No matches played by either player | Sections B, C, D, E show appropriate "not enough data" or "no matches yet" messages; Section A always renders |
| Player left or was removed from a club | Their match records are retained; historical H2H/partner records remain valid; name may display as "[Former Member]" in individual match citations within C.1/C.2 detail views |
| Player account deleted (future) | Name displays as "[Deleted Player]"; aggregated stats and H2H counts are preserved; profile snapshot shows "[Deleted Player]" with no photo |
