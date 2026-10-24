# Umpire Score Submission Specification

## Purpose

Documented final-score lock, confirmation, Client App review-phase trigger, dispute/void, and optional authenticated rating.

## Status

**Documented intent — not implemented.** Umpire App is coming-soon.

## Actors

Umpire (guest or authenticated), Que Master, match players.

## Requirements

### Requirement: Confirm then lock
Submit Final Score SHALL open a confirmation dialog showing team totals and set breakdown. There SHALL be no auto-submit. Cancel SHALL return to scoring with no changes. Confirm SHALL lock the score on the server. Scoring method SHALL be `umpire_app`. Winner SHALL be derived from set wins.

#### Scenario: Cancel confirm
- GIVEN the umpire opened the confirm dialog
- WHEN they cancel
- THEN scoring remains unlocked

### Requirement: After submit
The umpire view SHALL become read-only with “Score submitted. Thank you.” Authenticated umpires MAY be offered optional ratings; guests SHALL end. Que Master SHALL be notified “Score submitted for Court [X]”. The match SHALL enter Review Phase. Players SHALL receive a review prompt. Session leaderboard SHALL update.

#### Scenario: Guest ends
- GIVEN a guest confirms submit
- WHEN lock succeeds
- THEN they are not prompted to rate
- AND their scoring session ends

### Requirement: Score lock
Umpire scores SHALL be final once submitted (RULE-024). The umpire SHALL NOT edit or resubmit. Only the Que Master MAY override or void via Client App dispute. Overrides SHALL be logged with Que Master identity and timestamp. The umpire SHALL NOT be notified of a dispute.

#### Scenario: Umpire cannot edit
- GIVEN the score is locked
- WHEN the umpire tries to change a point
- THEN the view stays read-only

### Requirement: Dispute options
Que Master dispute SHALL offer override (manual correct score) or void (excluded from stats). `04_score_submission.md` still says void marks Unscored; canonical language is Voided.

#### Scenario: Void from dispute
- GIVEN a disputed umpire score
- WHEN the Que Master voids
- THEN the match is Voided and excluded from stats

### Requirement: Optional authenticated rating
Authenticated umpires MAY rate 1–5 per skill dimension (skippable) at weight ×3 within the 24-hour window. Skipping SHALL have no consequence. Guests SHALL not see the prompt.

#### Scenario: Skip rating
- GIVEN an authenticated umpire just submitted
- WHEN they dismiss the rating prompt
- THEN match completion is unaffected

## Source

- `docs/business_logic/umpire_app/04_score_submission.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
