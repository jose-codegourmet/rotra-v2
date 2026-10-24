# Review System Specification

## Purpose

Documented post-match Rate and Review: who may submit, anonymity, profanity filter, match completion, and guest umpire limits.

## Status

**Documented product rules** from `docs/business_logic/client_app/07_review_system.md`. Not implemented as live review APIs. Review-flagging is documented as Phase 2 future.

## Actors

Player in the match, Que Master, Assigned Umpire, Quick Umpire (authenticated), Quick Umpire (guest), Admin.

## Requirements

### Requirement: Who may review
Within 24 hours after the match is marked complete:
- A Player MAY rate every other player in the match 1–5 and MAY add optional anonymous text up to 280 characters
- A Que Master MAY rate every player 1–5 and MAY add an optional named note up to 140 characters (weight ×3)
- Assigned and authenticated Quick Umpires MAY optionally rate 1–5 (weight ×3) and SHALL NOT submit text
- Guest Quick Umpires SHALL NOT rate or review

If the Que Master also played, their player-review scores SHALL use standard player weight; their Que Master ratings SHALL keep ×3.

#### Scenario: Guest umpire
- GIVEN a guest Quick Umpire submitted the score
- WHEN the review phase starts
- THEN the guest is not prompted to rate
- AND no umpire review record is created

### Requirement: Anonymous player text
Player→Player text SHALL be anonymous to the rated player. Before viewing own text reviews, the player MUST acknowledge a persistent once-per-player warning that reviews may be critical. Reviews SHALL then be shown aggregated chronologically with no filter by match or author.

#### Scenario: First view acknowledgment
- GIVEN a player has never acknowledged the review warning
- WHEN they open received text reviews
- THEN they must acknowledge the warning before the texts are shown

### Requirement: Profanity filter
A profanity filter SHALL run on review text before save (client and server). Failed text SHALL be rejected and not saved. The filter SHALL not apply to numeric ratings.

#### Scenario: Blocked text
- GIVEN a review contains a blocked word
- WHEN the player submits
- THEN the review is rejected
- AND nothing is stored

### Requirement: Match completion
A match SHALL become Complete only when:
- If an umpire is assigned, the umpire has submitted the final score
- AND all players have submitted reviews OR the Que Master has finalized

Que Master finalization SHALL complete the match immediately. Reviews MAY still be submitted after finalize within 24 hours; they SHALL update skill ratings retroactively and MUST NOT change Complete status.

> `00_ubiquitous_language.md` says EXP/MMR may settle at Finalized and the review window starts at Finalize. `07` / `18` start the 24-hour window at Complete. This spec records the `07` / `18` completion rule and does not resolve the glossary conflict.

#### Scenario: Finalize before all reviews
- GIVEN an assigned umpire has submitted the score
- AND some players have not reviewed
- WHEN the Que Master finalizes
- THEN the match is Complete
- AND remaining reviews may still be submitted for 24 hours

### Requirement: Authenticated Quick Umpire detection
Logged-in rating access SHALL be detected when the Quick Umpire token is opened. Login after opening the link SHALL NOT retroactively grant review access for that session.

#### Scenario: Login after token open
- GIVEN a guest opened the token
- WHEN they later sign in
- THEN they still cannot rate that match as an authenticated umpire

### Requirement: Review flagging is future
Players flagging a received review for Club Owner / Admin action is documented as Phase 2 future. `flagged` / `removed` statuses MAY exist in the data model ahead of that flow.

#### Scenario: Phase 2 flagging
- GIVEN MVP
- WHEN a player wants to flag a review
- THEN that workflow is documented as not required for MVP

## Source

- `docs/business_logic/client_app/07_review_system.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
