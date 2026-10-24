# Gamification Specification

## Purpose

Documented EXP, ranking tiers, MMR eligibility, mixed-rank asymmetry, void reversals, and future badges.

## Status

**Documented product rules** from `docs/business_logic/client_app/14_gamification.md`. Current `onboarding` grants a one-time +20 EXP profile bonus. Other EXP/MMR/tier behavior is not shipped as live competitive math. Badges are Phase 3.

## Actors

Player, Que Master, session host, Umpire, Admin.

## Requirements

### Requirement: Cosmetic only
EXP, tiers, and badges SHALL have no effect on queue priority or match eligibility. There SHALL be no pay-to-win or purchases.

#### Scenario: High EXP player waits
- GIVEN two prepared players, one Titan and one Cadet
- WHEN Automatic or Manual Queueing assigns the next match
- THEN EXP tier MUST NOT change queue priority

### Requirement: Session-type eligibility
Match-linked EXP, session-attendance EXP, MMR, and ranked progression SHALL apply only to Club Que Session — MMR. Player-organized / Friendly and Fun Games SHALL record matches and skill reviews but grant no match EXP or MMR. Completing profile SHALL grant one-time +20 EXP regardless of session type.

#### Scenario: Fun Games win
- GIVEN a scored Fun Games win
- WHEN progression is applied
- THEN no EXP and no MMR change

### Requirement: EXP earning table
On MMR club schedules only, documented baselines SHALL be:
- Play a completed scored match: +10 (may scale)
- Win: +15 (may scale)
- Submit a review: +5 (up to 3 per doubles match)
- Rated 4 or 5 by an opponent: +5 per such opponent
- Umpire submits final score: +8
- Mark I Am In: +5 once per session
- First match ever (if that match is MMR): +25 one-time
- First win (if that win is MMR): +25 one-time

EXP SHALL be global across clubs. On MMR schedules, losses MAY reduce EXP (Admin-configurable). Voided matches SHALL reverse EXP and MMR attributed to that match.

#### Scenario: Profile bonus is session-agnostic
- GIVEN a player completes profile
- WHEN the one-time bonus is granted
- THEN +20 EXP is awarded even if they have never played MMR

### Requirement: Tiers
Cadet through Titan SHALL be EXP-based with Admin-configurable thresholds (Cadet 1 at 0 through Titan 5 at 27,000). Apex N and Apex Predator SHALL be position-based on the global leaderboard after Titan 5. Only one player SHALL hold Apex Predator. Ranking tiers SHALL never decrease below the tier already achieved, including after void reversals (RULE-042).

#### Scenario: Void does not demote tier
- GIVEN a player is Warrior 1
- WHEN a void reverses EXP below the Warrior threshold
- THEN the Warrior tier is preserved

### Requirement: Asymmetric mixed-rank deltas
On MMR club matches, when teammates span a large skill/MMR gap (Admin-configurable), lower-rated players SHALL gain less and lose more; higher-rated players SHALL gain more and lose less. Calibration multiplier SHALL stack multiplicatively with asymmetry.

#### Scenario: Carried beginner win
- GIVEN a much lower-rated partner wins with a much higher-rated teammate
- WHEN EXP/MMR are applied
- THEN the lower-rated gain is reduced relative to a balanced match

### Requirement: EXP log
Each player SHALL be able to view their own EXP transaction log (date, action, change, match/session reference, running total). The log SHALL be visible only to that player.

#### Scenario: Own log
- GIVEN Player A earned match EXP
- WHEN Player B opens Player A's profile
- THEN they do not see Player A's EXP transaction log

### Requirement: Badges are Phase 3
One-time badges (First Rally, First Blood, Decade Club, and others listed in `14_gamification.md`) SHALL be future. Unearned badges MAY show as locked with the unlock condition.

#### Scenario: Badge catalog not MVP
- GIVEN MVP
- WHEN a player finishes a first match
- THEN the First Rally badge is documented as Phase 3

## Source

- `docs/business_logic/client_app/14_gamification.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
