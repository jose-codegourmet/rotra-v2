# Match History Specification

## Purpose

Documented persistent per-player match records, public vs private fields, void handling, retention, and filters.

## Status

**Documented product rules** from `docs/business_logic/client_app/12_match_history.md`. Current `player-profile` still renders mock match history.

## Actors

Players (own vs public viewers), Que Masters, Club Owners.

## Requirements

### Requirement: Record lifecycle
A match record SHALL be created when the Que Master adds the match to the queue and SHALL finalize when the match is Complete.

#### Scenario: Added to queue
- GIVEN a Que Master adds a match
- WHEN the queue accepts it
- THEN a match record exists before play starts

### Requirement: Public history fields
Public profile history SHALL show date, club name, opponents, partners, score (if scored), result (Win / Loss / Draw / Voided), and singles/doubles format. Raw text reviews SHALL be player-only after acknowledgment. Per-rater ratings SHALL stay aggregate-only. Payment status SHALL be Que Master / Club Owner only.

`12_match_history.md` still lists Unscored as a result enum; `18` requires Voided instead of Unscored.

#### Scenario: Public result
- GIVEN a completed scored match
- WHEN another player opens the profile history
- THEN they see opponents, score, and Win/Loss
- AND they do not see raw review text

### Requirement: Voided matches
A Que Master MAY void a match after completion. The record SHALL be retained and flagged Voided. Voided matches SHALL be excluded from leaderboards, W/L stats, skill rating, and EXP/MMR (already applied amounts reversed). Void reason SHALL be visible to the Club Owner.

#### Scenario: Void reverses EXP
- GIVEN EXP was granted for a match
- WHEN the Que Master voids it
- THEN EXP and MMR for that match are reversed
- AND the record remains for audit

### Requirement: Retention
Match records SHALL never be deleted when a player leaves a club, a club is archived, or (future) a player deletes their account. Left/removed names SHALL display as "[Former Member]". Future account deletion SHALL anonymize to "[Deleted Player]" without removing records.

#### Scenario: Club archived
- GIVEN the club is archived
- WHEN match history is queried
- THEN historical matches remain

### Requirement: Filters
History MAY be filtered by club, time range (all time / 30d / 90d / custom), result, format, and opponent name.

#### Scenario: Filter wins
- GIVEN a player with mixed results
- WHEN they filter Result = Wins
- THEN only wins are listed

## Source

- `docs/business_logic/client_app/12_match_history.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
