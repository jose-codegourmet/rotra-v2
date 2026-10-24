# 21 — MMR Calibration

## Overview

When a new player enters competitive play, the system has no data to place them accurately on the MMR ladder. All players start at 1000 MMR regardless of real-world skill. The **calibration** period covers a player's first N completed MMR matches (default 10) and applies **amplified MMR deltas** so ratings converge quickly toward the player's true level — preventing extended mismatches between experienced players and genuine beginners.

Calibration affects **MMR math only**. It does not change EXP awards, session eligibility, queue priority, or any other system behavior.

---

## 21.1 Calibration Lifecycle

### Entry

A player enters calibration automatically the first time they complete a scored match in an MMR-eligible session (`origin = club_queue`, `schedule_type = mmr`). There is no opt-in or opt-out.

### Progress

The system tracks completed MMR matches via the cached counter `profiles.mmr_matches_played`. Each completed, scored match in an MMR session increments the counter by 1. Voided matches decrement it (see §21.4).

### Completion

When `mmr_matches_played` reaches the configured threshold (`calibration.required_matches`, default 10):

1. `profiles.calibration_completed_at` is set to the current timestamp
2. All subsequent MMR transactions use the standard (1.0x) multiplier
3. The "Calibrating" indicator is removed from the player's card

A player who has never played an MMR match has `mmr_matches_played = 0` and `calibration_completed_at = NULL`. They are not yet "calibrating" — they enter calibration upon their first MMR match completion.

---

## 21.2 Amplified MMR Deltas

During calibration, every MMR delta (gain or loss) is multiplied by `calibration.mmr_multiplier` (default 2.0) before being applied to the player's rating.

### Formula

```
effective_delta = base_delta × calibration_multiplier × asymmetry_multiplier
```

Where:
- `base_delta` is the standard MMR change for a win or loss (Admin-configurable K-factor / formula)
- `calibration_multiplier` is `calibration.mmr_multiplier` if the player is calibrating, otherwise 1.0
- `asymmetry_multiplier` is the relevant `mmr_asymmetry_config` multiplier if the teammate MMR gap exceeds `mmr_gap_threshold`, otherwise 1.0

The multipliers stack **multiplicatively**. Both apply independently based on their respective conditions.

### MMR floor

The MMR floor of 0 is enforced **after** the multiplied delta is applied. If the effective delta would push MMR below 0, the `amount` recorded in `mmr_transactions` is capped so `post_mmr` is exactly 0.

### Transaction recording

Each `mmr_transactions` row created during calibration has `is_calibration = true`. The `amount` field records the **effective** (already multiplied) delta, and `pre_mmr` / `post_mmr` reflect the actual rating before and after. This keeps the ledger self-consistent — summing amounts always reproduces the rating history.

---

## 21.3 Calibration Config (Admin)

These keys live in `platform_config` and are managed from the Admin App:

| Config Key | Description | Default |
|---|---|---|
| `calibration.required_matches` | Number of completed MMR matches required to finish calibration | 10 |
| `calibration.mmr_multiplier` | Multiplier applied to MMR deltas during calibration | 2.0 |

### Change behavior

- Config changes apply **forward only**. A player mid-calibration uses whatever config values are active at the time each match completes.
- Changing `required_matches` mid-flight: if a player has already played 8 matches and the threshold is lowered from 10 to 7, calibration completes on the next match-completion check (the system evaluates `mmr_matches_played >= required_matches` at transaction time).
- Raising the threshold does **not** re-open calibration for players whose `calibration_completed_at` is already set.

---

## 21.4 Void Handling

When a match completed during calibration is later voided:

1. A compensating `mmr_transactions` row is inserted with reason `match_voided_reversal` and `is_calibration = true`
2. `profiles.mmr_matches_played` is decremented by 1
3. If the decrement pushes `mmr_matches_played` below `calibration.required_matches` **and** `calibration_completed_at` was set by the voided match (i.e. it was the threshold-completing match), `calibration_completed_at` is reset to `NULL` and the player re-enters calibration

The reversal amount equals the negative of the original transaction's `amount` (which already included the calibration multiplier), capped by the MMR floor.

---

## 21.5 Que Master Visibility

### Add Match interface

When a player is in calibration (`calibration_completed_at IS NULL` and `mmr_matches_played > 0`, or `mmr_matches_played = 0` for never-played), the Que Master sees:

- A **"Calibrating"** badge on the player card in the player pool (same placement as the tier badge)
- The calibration progress: **"N / 10 matches"** (where 10 is the current `calibration.required_matches` value)

Players who have never played an MMR match show **"New — 0 / 10"** to distinguish them from mid-calibration players.

### Purpose

This indicator helps Que Masters make informed team-building decisions. A calibrating player's MMR is volatile and may not yet reflect their true skill — the QM can weigh this when balancing teams.

---

## 21.6 Player Profile Display

### Own profile

The player sees their calibration status in the MMR section of their profile:

- During calibration: **"Calibrating — 4 / 10 matches"** with a progress indicator
- After calibration: the indicator disappears; MMR is displayed normally

### Public profile

Other players see the "Calibrating" label next to the MMR value when the player is still calibrating. This provides context that the displayed MMR is provisional.

---

## 21.7 Edge Cases

### Player has no MMR matches

`mmr_matches_played = 0`, `calibration_completed_at = NULL`. The player is not yet calibrating — they simply haven't entered competitive play. Their MMR remains at the default 1000 until their first MMR match completes.

### Legacy accounts (pre-feature migration)

Players who already have MMR transaction history before this feature ships:

- `mmr_matches_played` is backfilled by counting existing non-void `mmr_transactions` rows (where `reason IN (match_won, match_lost)`) per player
- If the count meets or exceeds `calibration.required_matches`, `calibration_completed_at` is set to the `created_at` of the Nth transaction
- If below the threshold, the player resumes calibration from their current count with the amplified multiplier applying to remaining matches
- Existing transactions are **not** retroactively recomputed with the calibration multiplier — the amplification is forward-only

### Player plays across multiple clubs

Calibration is **global** (tied to the profile, not a club). MMR matches from any club's MMR session count toward the same calibration counter. This is consistent with MMR being a platform-wide rating.

### Calibration multiplier set to 1.0

If an Admin sets `calibration.mmr_multiplier` to 1.0, calibration tracking still occurs (counter increments, completion fires, badge shows) but the effective MMR delta is identical to post-calibration play. This is a valid configuration for disabling the amplification while retaining the visibility indicator.

---

## 21.8 Interaction with Other Systems

| System | Interaction |
|---|---|
| EXP | Calibration does **not** affect EXP awards. Match EXP uses standard rates regardless of calibration status. |
| Ranking tiers | Tiers are EXP-based. Since calibration only affects MMR, tiers are unaffected. |
| Skill ratings | Peer review ratings are independent of MMR. Calibration has no effect. |
| Anti-sandbagging | The sandbagging detection system operates on skill rating divergence, not MMR. Calibration has no direct interaction. |
| Leaderboards | Session leaderboards use win count, not MMR. The global leaderboard minimum match threshold (`thresholds.global_leaderboard_min_matches`, default 20) already gates new players independently of calibration. |
| Asymmetric MMR | Stacks multiplicatively with calibration multiplier (see §21.2). |
| Queue priority | Calibration status has no effect on queue position or session eligibility (RULE-074). |

---

## 21.9 Canonical Rules

```
RULE-069: A player with fewer than calibration.required_matches completed MMR matches
          is in calibration status. Calibration status is determined by comparing
          profiles.mmr_matches_played against the current platform_config threshold.

RULE-070: During calibration, all MMR deltas are multiplied by calibration.mmr_multiplier
          before being applied. The multiplied amount is recorded in mmr_transactions.amount.

RULE-071: Voided calibration matches decrement profiles.mmr_matches_played by 1.
          If the decrement drops the counter below calibration.required_matches and
          calibration_completed_at was set by the voided match, the player re-enters
          calibration (calibration_completed_at is reset to NULL).

RULE-072: The calibration multiplier and the asymmetry multiplier (mmr_asymmetry_config)
          stack multiplicatively. Both are evaluated independently per transaction.

RULE-073: The "Calibrating" indicator is visible to Que Masters, Club Owners, and the
          player themselves. It appears in the Add Match player pool, on the player's
          own profile, and on the public profile.

RULE-074: Calibration status does not affect queue priority, session eligibility,
          or any functional behavior outside of MMR delta calculation and display indicators.
```

---

## Dependencies and References

- `docs/business_logic/client_app/14_gamification.md` — MMR behavior, asymmetric rules
- `docs/business_logic/client_app/08_queue_session.md` — Session types, MMR eligibility
- `docs/business_logic/admin_app/05_platform_config.md` — Calibration config keys
- `docs/business_logic/admin_app/07_mmr_and_skills_management.md` — Admin calibration management
- `packages/db/prisma/models_profile.prisma` — `mmrMatchesPlayed`, `calibrationCompletedAt`
- `packages/db/prisma/models_gamification.prisma` — `MmrTransaction.isCalibration`
