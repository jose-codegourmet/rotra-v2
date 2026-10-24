# Umpire Scoring Specification

## Purpose

Documented Umpire App scoring interface: points, undo, sets, deuce, and visual states.

## Status

**Documented intent — not implemented.** Umpire App is coming-soon.

## Actors

Umpire (guest or authenticated), Que Master (configures format/deuce/win condition).

## Requirements

### Requirement: Single-screen scoring
The umpire SHALL stay on one mobile screen for the assigned match. `+ POINT` SHALL add 1 point to that team for the current set. Undo SHALL remove only the most recently awarded point (one level) and SHALL be disabled after final submit. Guest umpires SHALL see names only; photos SHALL appear only when the umpire is authenticated and players have photos.

#### Scenario: One-level undo
- GIVEN Team A then Team B scored
- WHEN undo is used once
- THEN Team B loses one point
- AND a second prior point cannot be undone

### Requirement: Sets and deuce
Win condition and Best of 1 / Best of 3 SHALL be set by the Que Master, not the umpire. When a set is won, both point counters SHALL reset to 0 and the next set SHALL start automatically. If deuce is configured (e.g. 20–20 win by 2), the UI SHALL show DEUCE and the set SHALL end when one team leads by 2.

#### Scenario: Set win at 21
- GIVEN score limit 21 and Team A reaches 21
- WHEN the set ends
- THEN set score advances
- AND point counters reset to 0

### Requirement: Visual states
Documented states SHALL include: waiting (buttons disabled), in progress, set-just-won overlay, match-point indicator, disconnected (points queued locally), already submitted (read-only final score), and token revoked.

#### Scenario: Match not started
- GIVEN the match has not begun
- WHEN the umpire view loads
- THEN scoring buttons are disabled

### Requirement: Accessibility
Interactive elements SHALL meet a minimum 44×44pt touch target. Color SHALL not be the sole differentiator (position and text also identify teams). High-contrast mode SHALL be supported.

#### Scenario: Team identity
- GIVEN two teams
- WHEN scores are shown
- THEN teams are distinguished by position/label, not color alone

## Source

- `docs/business_logic/umpire_app/03_scoring_interface.md`
