# MMR Calibration Specification

## Purpose

Documented first-N competitive-match calibration: amplified MMR deltas, counters, voids, visibility, and Admin config.

## Status

**Documented product rules** from `docs/business_logic/client_app/21_mmr_calibration.md`. Prisma fields `mmrMatchesPlayed` and `calibrationCompletedAt` may exist; this spec does not claim the calibration engine is live.

## Actors

Players, Que Masters, Club Owners, Admins.

## Requirements

### Requirement: Entry and completion
All players SHALL start at 1000 MMR with floor 0. A player SHALL enter calibration on their first completed scored Club Que Session — MMR match. Progress SHALL be `profiles.mmr_matches_played`. When the count reaches `calibration.required_matches` (default 10), `calibration_completed_at` SHALL be set and later deltas SHALL use multiplier 1.0. A player with 0 MMR matches SHALL show as New, not mid-calibration.

#### Scenario: Tenth match completes calibration
- GIVEN `mmr_matches_played` is 9 and required_matches is 10
- WHEN the player completes another scored MMR match
- THEN `calibration_completed_at` is set
- AND the Calibrating indicator is removed

### Requirement: Amplified deltas
During calibration:
```
effective_delta = base_delta × calibration_multiplier × asymmetry_multiplier
```
Default `calibration.mmr_multiplier` SHALL be 2.0. Multipliers SHALL stack multiplicatively. Floor 0 SHALL be enforced after the multiplied delta. Calibration transactions SHALL set `is_calibration = true` and store the effective amount.

#### Scenario: Calibration win
- GIVEN a calibrating player and base_delta +20 with no asymmetry
- WHEN the transaction is written
- THEN amount is +40 and `is_calibration` is true

### Requirement: Void handling
Voiding a calibration match SHALL insert a compensating reversal, decrement `mmr_matches_played` by 1, and reset `calibration_completed_at` to NULL if that void was the threshold-completing match.

#### Scenario: Void the completing match
- GIVEN calibration completed on match 10
- WHEN that match is voided
- THEN the player re-enters calibration

### Requirement: Config is forward-only
Admin keys `calibration.required_matches` and `calibration.mmr_multiplier` SHALL apply to future transactions only. Raising the threshold SHALL NOT re-open completed calibration. Lowering it MAY complete calibration on the next check if the count already meets the new threshold. Setting multiplier to 1.0 SHALL keep tracking and badges but remove amplification.

#### Scenario: Raise threshold after completion
- GIVEN `calibration_completed_at` is set
- WHEN required_matches is raised
- THEN that player stays completed

### Requirement: Visibility without gameplay effect
Calibrating / New indicators SHALL be visible to Que Masters, Club Owners, and the player (Add Match pool, own profile, public profile). Calibration SHALL NOT affect EXP, tiers, skill ratings, sandbagging, queue priority, or session eligibility (RULE-074). Calibration is global across clubs.

#### Scenario: No queue effect
- GIVEN a calibrating player
- WHEN queue priority is computed
- THEN calibration status is ignored

## Source

- `docs/business_logic/client_app/21_mmr_calibration.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
