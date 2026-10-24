# Skill Rating Specification

## Purpose

Documented six-dimension peer Skill Rating, source weights, submission window, visibility gates, and anti-sandbagging. Distinct from Playing level, MMR, and EXP tier.

## Status

**Documented product rules** from `docs/business_logic/client_app/06_skill_rating.md`. Not implemented as live rating math. Current `player-profile` still renders mock skill/radar data.

## Actors

Player (rater/ratee), Que Master, Umpire, Partner, Opponent, Admin, Club Owner.

## Requirements

### Requirement: Skill Rating is separate from MMR
Skill Rating SHALL be a computed 1–5 score across six dimensions. MMR SHALL move only on Club Que Sessions with Session type MMR. Skill dimensions SHALL update from post-match reviews on all completed session types when raters submit scores.

#### Scenario: Fun Games still updates skill
- GIVEN a completed Fun Games match with submitted dimension scores
- WHEN ratings are applied
- THEN Skill Rating updates
- AND MMR does not change

### Requirement: Six dimensions
Ratings SHALL use these dimensions, each 1–5 independently: Attack, Defense, Net & Touch, Precision & Control, Athleticism, Game Intelligence. Overall SHALL be the weighted average of dimension scores (default equal 1/6, Admin-configurable). Sub-skills SHALL be guidance only and not separately scored. A rater MAY skip an unobserved dimension; skipped dimensions SHALL be excluded, not counted as 0.

Displayed overall SHALL be rounded to one decimal. Rolling average SHALL use the most recent 50 external match assessments per dimension.

#### Scenario: Skipped dimension
- GIVEN a rater leaves Attack blank and scores Defense 4
- WHEN the submission is applied
- THEN Attack is excluded from that match
- AND Defense contributes 4

### Requirement: Source weights
Source weights SHALL be: Que Master ×3, Umpire ×3, Opponent ×2, Partner ×1.5, Self-assessment ×1. Same source type within one match SHALL be averaged per dimension before combining.

Self-assessment weight SHALL phase out per dimension:
- 0–4 external assessments: ×1
- 5–9: ×0.5
- 10–19: ×0.25
- 20+: excluded

> `00_ubiquitous_language.md` states a single “phases out after 5+ external ratings” threshold. This spec follows the stepped table in `06_skill_rating.md` and `18_canonical_rules.md` RULE-028.

#### Scenario: Self-assessment after 20 externals
- GIVEN a dimension with 20 external match assessments
- WHEN overall Skill Rating is computed
- THEN self-assessment is excluded for that dimension

### Requirement: Submission window
The rating window SHALL open after the match is marked complete and SHALL close 24 hours later. Late submissions SHALL be discarded. A reminder SHALL be sent 2 hours before close. A player SHALL NOT rate themselves in the post-match flow. A rater SHALL NOT rate a match they did not participate in. Que Master SHALL NOT submit ratings for a session they did not host. Skipping all dimensions SHALL not count as a submission.

#### Scenario: Late rating discarded
- GIVEN a match completed more than 24 hours ago
- WHEN a player submits a rating
- THEN it is discarded and not applied

### Requirement: Public visibility gates
Overall Skill Rating and per-dimension radar SHALL be public. Individual rater identities SHALL not be shown to the rated player. A dimension with fewer than 5 external ratings SHALL display “Not enough data” publicly. Sandbagging flag SHALL be visible only to Que Masters and Club Owners.

#### Scenario: Sparse dimension hidden
- GIVEN Attack has 3 external ratings
- WHEN a public profile is viewed
- THEN Attack shows “Not enough data”

### Requirement: Anti-sandbagging
Sandbagging SHALL flag when two or more signals are true:
- Win rate > 60% against opponents whose overall rating is 1+ above
- External dimension averages > 1.0 higher than self-assessment
- Partners rate ≥ 4 across most dimensions while self-assessment ≤ 2
- Overall rating drops > 0.5 within 2 weeks of being elevated, repeated twice

When flagged, displayed playing level SHALL be overridden (1.0–2.0 Beginner, 2.1–3.5 Intermediate, 3.6–5.0 Advanced), a flag shown to QMs and Club Owners, and the player notified. The flag SHALL auto-clear after 30+ consecutive days without signals. Club Owner MAY manually clear with a logged justification.

#### Scenario: Override displayed level
- GIVEN a flagged player whose computed overall is 3.8
- WHEN a public profile is shown
- THEN displayed playing level is Advanced
- AND the self-declared level is retained internally

### Requirement: Admin dimension config is forward-only
Dimensions SHALL be admin-managed without a deploy. Changes SHALL affect future ratings only. Historical ratings stored against a dimension ID SHALL never be retroactively recomputed.

#### Scenario: Retire a dimension
- GIVEN an Admin retires Defense
- WHEN new ratings are collected
- THEN Defense is hidden
- AND historical Defense ratings remain stored

## Source

- `docs/business_logic/client_app/06_skill_rating.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
- `docs/business_logic/00_ubiquitous_language.md`
