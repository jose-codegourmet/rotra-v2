# Canonical Rules Specification

## Purpose

Non-negotiable documented system rules from `docs/business_logic/client_app/18_canonical_rules.md`. These MUST be enforced at the server/business-logic layer when implemented. This spec is the checklist; detailed behavior lives in the domain specs.

## Status

**Documented product rules.** Current implemented behavior is specified in existing Current specs. Where this list conflicts with a Current spec, the Current spec describes what the code does now.

## Actors

Players, Club Owners, Que Masters, umpires, Admins, the server.

## Requirements

### Requirement: Identity and club ownership
- RULE-001: All users start as Players.
- RULE-002: One Facebook account maps to exactly one Player; duplicate registration returns the existing account.
- RULE-003: Owning a club requires an admin-approved application per club with a 24-hour review SLA from `updated_at`.

#### Scenario: Duplicate Facebook
- GIVEN an existing `facebook_id`
- WHEN the same Facebook account signs in again
- THEN the existing Player is returned

### Requirement: Role scoping
RULE-004 through RULE-008: Que Master is per-club, only active members are eligible, Club Owners cannot self-assign as Que Master, only the Club Owner assigns/revokes (no cap, bulk allowed), and roles do not cross clubs.

#### Scenario: QM cannot assign QM
- GIVEN a Que Master
- WHEN they try to assign another Que Master
- THEN the assignment is refused

### Requirement: Membership and blacklist
RULE-009 through RULE-012 and RULE-043 through RULE-048: join via invite/QR, direct invite, or request; Auto-Approve OFF queues link/QR and requests; direct invites bypass Auto-Approve; blacklist is silent, per-club, requires prior removal, is logged, and un-blacklist does not re-admit.

#### Scenario: Silent blacklist
- GIVEN a blacklisted player follows an invite link
- WHEN they try to join
- THEN they see a generic error
- AND they are not told they are blacklisted

### Requirement: Sessions, slots, and host rules
RULE-013 through RULE-016 and RULE-064 through RULE-083 / RULE-075 through RULE-083: slot capacity is `players_per_court × number_of_courts`; overflow is waitlisted FIFO; one admission state at a time; only CO/QM create sessions; session type gates EXP/MMR; 5-hour free-cancel cutoff; password hashes only with 5-minute retry after first failure; Request a Match is a proposal; every field change writes Session Feed; no automatic no-show removal; I Am In is irreversible by the player after confirmation.

#### Scenario: Capacity
- GIVEN 2 courts and 4 players per court
- WHEN the 9th player registers
- THEN they are waitlisted

### Requirement: Automatic Queueing hard rules
RULE-084 through RULE-088: Automatic Queueing generates candidates only unless Full Automatic is enabled; Playing/Exited/Suspended cannot appear in candidates; repeated-match protection is advisory; stale candidates re-validate; voided matches do not affect form unless an explicit exception exists.

#### Scenario: Suspended player excluded
- GIVEN a Suspended player
- WHEN Automatic Queueing generates a candidate
- THEN that player is not included

### Requirement: Ratings, cost, integrity, leaderboards, EXP
RULE-017 through RULE-042 and RULE-054 through RULE-057: rotation eligibility, match completion, 24-hour rating window, stepped self-assessment phaseout, six dimensions, cost formula, server authority, never-delete match records, scored-only leaderboards, cosmetic EXP, void reversals, and non-decreasing tiers. Player comparison RULE-058 through RULE-063 are specified in `player-comparison`. Calibration RULE-069 through RULE-074 are specified in `mmr-calibration`.

#### Scenario: Server is source of truth
- GIVEN a client has stale local queue state
- WHEN it reconnects
- THEN it syncs full server state

## Source

- `docs/business_logic/client_app/18_canonical_rules.md`
