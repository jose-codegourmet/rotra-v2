# Admin App — 05 Platform Configuration

## Overview

Platform configuration covers global constants and parameters that control how the Client App behaves — specifically gamification values, skill dimensions, and system-level thresholds. These are managed from the Admin App and apply without a code deploy.

---

## Gamification Config

Reference: `[../client_app/14_gamification.md](../client_app/14_gamification.md)`
Canonical model: `[../../database/06_gamification.md](../../database/06_gamification.md)`

### EXP Rates

Admins can adjust EXP awarded for match-related actions only:


| Action Key              | Description                             | Default |
| ----------------------- | --------------------------------------- | ------- |
| `exp.match_played`      | EXP per qualifying match played                              | 10      |
| `exp.match_won`         | Bonus EXP for winning a qualifying match                     | 15      |
| `exp.match_voided_reversal` | System-generated compensating EXP on match voiding      | `-(original amount)` |


Changes to EXP rates apply to **future actions only**. Historical EXP is not recalculated.
Eligibility: competitive `club_queue` sessions with `schedule_type = mmr`.

### MMR Asymmetry Config

Admins can adjust MMR asymmetry values under `mmr_asymmetry_config`:

| Config Key | Description |
| ---------- | ----------- |
| `mmr_gap_threshold` | MMR gap that enables mixed-rank asymmetry behavior |
| `lower_rated_win_multiplier` | Win multiplier for lower-rated teammate when threshold is met |
| `lower_rated_loss_multiplier` | Loss multiplier for lower-rated teammate when threshold is met |
| `higher_rated_win_multiplier` | Win multiplier for higher-rated teammate when threshold is met |
| `higher_rated_loss_multiplier` | Loss multiplier for higher-rated teammate when threshold is met |

Reference operational rules: `[07_mmr_and_skills_management.md](./07_mmr_and_skills_management.md)`.

---

### MMR Calibration Config

Admins can adjust calibration parameters that control the amplified MMR period for new competitive players:

| Config Key | Description | Default |
| ---------- | ----------- | ------- |
| `calibration.required_matches` | Number of completed MMR matches required to finish calibration | 10 |
| `calibration.mmr_multiplier` | Multiplier applied to MMR deltas during calibration | 2.0 |

Changes apply to **future transactions only**. A player mid-calibration uses the config values active at the time each match completes. Raising the threshold does **not** re-open calibration for players who have already completed it.

Reference: `[../client_app/21_mmr_calibration.md](../client_app/21_mmr_calibration.md)`

---

### Ranking Tier Thresholds

Admins can adjust the EXP required to reach each EXP-based sub-rank. The **Apex** tiers are position-based and not configurable here — see the Apex Tier section below.

| Tier | Sub-rank | Default Min EXP |
| --------- | -------- | --------------- |
| Cadet | 1 | 0 |
| Cadet | 2 | 150 |
| Warrior | 1 | 350 |
| Warrior | 2 | 600 |
| Warrior | 3 | 900 |
| Elite | 1 | 1,300 |
| Elite | 2 | 1,800 |
| Elite | 3 | 2,400 |
| Elite | 4 | 3,200 |
| Master | 1 | 4,200 |
| Master | 2 | 5,500 |
| Master | 3 | 7,000 |
| Master | 4 | 9,000 |
| Titan | 1 | 11,500 |
| Titan | 2 | 14,500 |
| Titan | 3 | 18,000 |
| Titan | 4 | 22,000 |
| Titan | 5 | 27,000 |

**Rule**: Tier thresholds can be raised but not lowered below the highest currently achieved sub-rank by any player. A threshold change that would retroactively demote players is blocked with a warning.

Reference: RULE-042 — Ranking tiers never decrease below the tier already achieved.

#### Apex Tier (Position-Based)

The **Apex** and **Apex Predator** tiers are assigned by platform rank, not EXP. Admins can configure:

| Config Key | Description | Default |
| ---------- | ----------- | ------- |
| `apex.min_exp_to_qualify` | Minimum EXP a player must hold (≥ Titan 5) before their rank position is evaluated for Apex status | 27,000 |
| `apex.snapshot_interval_hours` | How often the global leaderboard is recalculated to reassign Apex positions | 24 |

* **Apex N** — The player's number reflects their current rank position among all qualifying Apex-tier players (e.g. Apex 3 = 3rd place)
* **Apex Predator** — Exclusively held by the single #1 ranked player on the platform at the time of each snapshot

---

### Badge Criteria

Badge unlock conditions are defined in constants and editable from the Admin App:


| Badge        | Trigger Condition (editable values)           |
| ------------ | --------------------------------------------- |
| First Blood  | Play first match                              |
| Hat Trick    | Win 3 matches in a single session             |
| Iron Stamina | Play 5+ matches in a single session           |
| Century Club | Reach 100 total matches played                |
| Consistent   | Attend 3+ sessions in a rolling 30-day window |
| ...          | (full list in `14_gamification.md`)           |


Changes to badge criteria apply to future evaluations. Players who already earned a badge do not lose it if the criteria changes.

---

## Skill Dimensions Config

Reference: `[../client_app/06_skill_rating.md](../client_app/06_skill_rating.md)`, RULE-055

### Managing Dimensions

The Admin App provides a dimension manager with the following capabilities:


| Action                              | Effect                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| **Add dimension**                   | New dimension appears in the post-match rating form immediately                       |
| **Edit dimension name/description** | Updates display text only; dimension ID is immutable                                  |
| **Add sub-skills to a dimension**   | Sub-skills appear as optional detail ratings within a dimension                       |
| **Retire a dimension**              | Dimension is hidden from new ratings; historical ratings against its ID are preserved |
| **Reorder dimensions**              | Changes display order in the rating form                                              |


### Rules for Dimension Changes

- Dimension IDs are generated on creation and never change
- Editing a dimension name does not affect stored ratings — they remain linked to the ID
- Retiring a dimension does not delete historical data
- Adding a new dimension does not backfill historical ratings — players start at "Not enough data" for the new dimension
- Bulk changes (editing multiple dimensions at once) require Super Admin approval

### Current Dimensions (defaults)


| ID                      | Name                |
| ----------------------- | ------------------- |
| `dim_attack`            | Attack              |
| `dim_defense`           | Defense             |
| `dim_net_touch`         | Net & Touch         |
| `dim_precision`         | Precision & Control |
| `dim_athleticism`       | Athleticism         |
| `dim_game_intelligence` | Game Intelligence   |


---

## System-Level Thresholds

These are global defaults that Club Owners and Que Masters can override per club/session. The Admin App sets the platform-wide defaults.


| Key                                         | Description                                                 | Default |
| ------------------------------------------- | ----------------------------------------------------------- | ------- |
| `thresholds.no_show_window_minutes`         | Minutes after session start before a no-show alert fires    | 15      |
| `thresholds.smart_monitoring_pct`           | Score % of win condition that triggers the Que Master alert | 90      |
| `thresholds.review_window_hours`            | Hours after match completion the review window stays open   | 24      |
| `thresholds.consistent_member_sessions`     | Min sessions in 30 days to count as "consistent"            | 3       |
| `thresholds.rating_unlock_min_scores`       | Min external ratings before a skill dimension is displayed  | 5       |
| `thresholds.win_rate_unlock_matches`        | Min scored matches before win rate is displayed             | 5       |
| `thresholds.advanced_stats_unlock_matches`  | Min scored matches before advanced stats are unlocked       | 20      |
| `thresholds.global_leaderboard_min_matches` | Min scored matches to appear on global leaderboard          | 20      |
| `thresholds.reapply_after_rejection_days`   | Days before a rejected Club Owner applicant can reapply     | 30      |


---

## Config Change Rules

- All config changes require the Admin to confirm with their password before saving
- Changes take effect immediately on save — there is no "draft" state for config
- Each change produces an audit log entry (see `[01_admin_overview.md](./01_admin_overview.md)`)
- Config changes in `staging` do not affect `production` (environments are isolated)
- If a change would violate a canonical rule (e.g. tier threshold demotion), the system blocks the save and explains the conflict
- MMR and match EXP settings are governed by `[07_mmr_and_skills_management.md](./07_mmr_and_skills_management.md)` and the canonical DB model in `[../../database/06_gamification.md](../../database/06_gamification.md)`

