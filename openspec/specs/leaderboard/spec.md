# Leaderboard Specification

## Purpose

Documented session, club, and future global leaderboards: sort order, scored-only counting, snapshots, and sharing.

## Status

**Documented product rules** from `docs/business_logic/client_app/10_leaderboard.md`. Global leaderboard is Phase 3. Current client session standings are derived from match rows in `queue-session`; there is no shipped club/global leaderboard product.

## Actors

Players, Que Masters, Club Owners, Admin (future global curation).

## Requirements

### Requirement: Scopes
Session leaderboards SHALL reset per session (MVP). Club leaderboards SHALL be cumulative across the club (MVP). Global platform-wide leaderboards SHALL be Phase 3.

#### Scenario: Session vs club
- GIVEN a player has wins in two sessions of the same club
- WHEN the session board is shown
- THEN only that session's wins count
- AND the club board includes both sessions

### Requirement: Sort order
All leaderboards SHALL sort by wins, then win rate, then games played (all highest first). Only scored, non-voided matches SHALL count. Product copy SHALL use Voided, not Unscored (`18` RULE-037). `10_leaderboard.md` still says Unscored for matches without a score; treat those as excluded / Voided.

#### Scenario: Win-rate tiebreak
- GIVEN Player A has 5 wins from 5 games and Player B has 5 wins from 8 games
- WHEN ranks are computed
- THEN Player A ranks above Player B

### Requirement: Session board
Session standings SHALL include player-organized / Friendly, Fun Games, and MMR matches when scored and not voided. All accepted players SHALL appear, including those with 0 games (at the bottom). Win rate SHALL show after ≥ 2 games in the session.

#### Scenario: Zero-game accepted player
- GIVEN an accepted player with no matches
- WHEN the session leaderboard renders
- THEN they appear at the bottom

### Requirement: Club board
Club cumulative win/loss SHALL include Friendly, Fun Games, and MMR. An MMR-only filter is optional and not required for MVP. Club win rate SHALL show after ≥ 5 games. Filters SHALL include All Time / Last 30 / Last 90 days and filter by session. Format filter (singles/doubles) is future.

#### Scenario: Fun Games counts for club wins
- GIVEN a scored Fun Games match
- WHEN the club leaderboard updates
- THEN that win/loss is included

### Requirement: Score authority
Umpire-submitted scores SHALL take precedence over Que Master scores when both exist. The Que Master MAY override via the documented dispute flow.

#### Scenario: Conflicting scores
- GIVEN umpire score 21–18 and Que Master score 21–19
- WHEN rankings are computed without a dispute override
- THEN the umpire score is used

### Requirement: Snapshot and former members
A session snapshot SHALL publish when the session is Completed and SHALL not change after publication. Voided matches SHALL be excluded. Historical records SHALL remain when a player leaves; public views SHALL show "[Former Member]".

#### Scenario: Player leaves club
- GIVEN a former member with scored club matches
- WHEN the club leaderboard is shown publicly
- THEN their results remain
- AND the name displays as "[Former Member]"

## Source

- `docs/business_logic/client_app/10_leaderboard.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
