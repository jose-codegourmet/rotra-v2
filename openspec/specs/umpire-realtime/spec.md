# Umpire Realtime Specification

## Purpose

Documented WebSocket score broadcast, server authority, smart-monitoring side effects, offline queueing, and single-token enforcement.

## Status

**Documented intent — not implemented.** Umpire App is coming-soon. Latency numbers are documented targets, not hard fail gates.

## Actors

Umpire App, authoritative server, Que Master Court View, players’ Courts tab.

## Requirements

### Requirement: Server authority
A persistent connection SHALL last for the match. The server SHALL be the source of truth (RULE-034). The Umpire App SHALL send events; the server SHALL validate, apply, and fan out.

#### Scenario: Client cannot extend token
- GIVEN a token expired server-side
- WHEN the umpire client stays open
- THEN access ends; the client cannot extend it

### Requirement: Event set
Umpire → server SHALL include `point_added`, `point_undone`, and `score_submitted`. Server → subscribers SHALL include `score_updated`, `set_completed`, `match_point_alert`, and `score_submitted`. Server → umpire SHALL include `token_revoked`, `session_ended`, `match_voided` (scoring disabled), and optional `que_master_override`.

#### Scenario: Point tap
- GIVEN the umpire taps + POINT for Team A
- WHEN the server accepts `point_added`
- THEN Court View and Courts tab receive `score_updated`

### Requirement: Smart monitoring
On each accepted `point_added`, the server SHALL alert the Que Master at 90% of win condition (configurable) and at match point. The Umpire App SHALL not need to know about those alerts.

#### Scenario: 19 of 21
- GIVEN win condition 21 and score reaches 19
- WHEN the point is applied
- THEN the Que Master is notified the match is nearing end

### Requirement: Offline queue
On disconnect, the umpire SHALL see “Reconnecting…”. Offline taps SHALL queue in memory and flush in order on reconnect with backoff 1s, 2s, 4s, 8s, max 30s. Points SHALL not be discarded. Session-end or void while offline SHALL be delivered on reconnect.

#### Scenario: Offline then void
- GIVEN the umpire is offline
- AND the Que Master voids the match
- WHEN the umpire reconnects
- THEN they see the void message and scoring is disabled

### Requirement: One umpire
Only one valid token per match SHALL be active. A second token while one is active SHALL be rejected. A replacement umpire SHALL start from the current server-authoritative score.

#### Scenario: New token mid-match
- GIVEN a score of 10–8 on the server
- WHEN a new token is issued after revoke
- THEN the new umpire starts at 10–8

### Requirement: Latency targets
Documented targets: point → Que Master < 200ms; point → players < 500ms; submit → status change < 1s; typical reconnect < 5s.

#### Scenario: Targets are not gates
- GIVEN a 300ms fan-out to Court View
- WHEN evaluating this spec
- THEN the 200ms figure is a documented target, not a hard product gate

## Source

- `docs/business_logic/umpire_app/05_realtime_communication.md`
- `docs/business_logic/umpire_app/README.md`
