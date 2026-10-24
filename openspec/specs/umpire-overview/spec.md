# Umpire Overview Specification

## Purpose

Documented Umpire App role: a temporary match-scoped scoring function, not a registered platform role.

## Status

**Documented intent — not implemented.** `apps/umpire` is coming-soon. Do not treat these rules as shipped.

## Actors

Quick Umpire (guest), Quick Umpire (authenticated), Assigned Umpire, Que Master, match players.

## Requirements

### Requirement: Match-scoped function
An umpire SHALL score one assigned match (tap points, track sets, submit final result). The job SHALL end when the score is submitted. Anyone MAY perform it, including someone who has never used the app.

#### Scenario: No lingering role
- GIVEN a guest submitted the final score
- WHEN the next match starts
- THEN they are not still an umpire unless a new token is issued

### Requirement: Access types
- Guest Quick Umpire: one-time token; no login; score only; no rating; anonymous in history
- Authenticated Quick Umpire: same token; optional 1–5 per skill dimension after submit; attributed in history
- Assigned Umpire: active session member assigned by Que Master; login required; in-app deep link; may rate

#### Scenario: Assigned umpire
- GIVEN a Que Master assigns a non-playing session participant
- WHEN the umpire opens the deep link
- THEN they score that match only

### Requirement: Allowed and forbidden
Umpire SHALL be able to view team names (photos only if authenticated), add a point, undo the last point, view set tracker, and submit the final score. Umpire SHALL NOT navigate elsewhere, change statuses/queue/settings, view payments, score more than one match at a time, or edit a score after submission. Only the Que Master MAY dispute or override.

If no umpire is assigned, the Que Master SHALL enter the score in the Client App.

#### Scenario: Cannot void
- GIVEN an umpire finished scoring
- WHEN they want to void the match
- THEN they cannot; only the Que Master can void

## Source

- `docs/business_logic/umpire_app/01_umpire_overview.md`
- `docs/business_logic/umpire_app/README.md`
