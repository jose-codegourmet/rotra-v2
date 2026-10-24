# Product Vision Specification

## Purpose

Documented product purpose, audiences, design constraints, and MVP out-of-scope for ROTRA. This is not implemented behavior.

## Status

**Documented product rules** from `docs/business_logic/client_app/01_product_vision.md` and the index in `docs/business_logic.md`. Not a claim that the platform currently meets these principles or metrics.

## Actors

Players, Que Masters, Club Owners, clubs. Venues are a secondary audience.

## Requirements

### Requirement: Product purpose
The platform SHALL combine queue-based match management, player statistics and skill tracking, gamified leaderboards, and club-based organization. The documented goal is to standardize casual badminton queueing while adding competitive integrity, transparency, and player identity.

#### Scenario: Three audiences
- GIVEN the documented vision
- WHEN audiences are listed
- THEN Players, Que Masters / Club Owners, and Clubs are the primary audiences

### Requirement: Design constraints
Documented design constraints SHALL include:
- Que Master operations reachable in 1–2 taps
- Players see only what is relevant to their current state
- Match results and ratings must be verifiable; no unchecked self-reporting
- Queue state must be live
- Roles are additive, not exclusive

#### Scenario: Additive roles
- GIVEN a Club Owner
- WHEN they play in another club they do not own
- THEN they remain a Player in that club

### Requirement: MVP out of scope
MVP SHALL treat professional/tournament-level organizations, coaching or training-plan features, and spectator or broadcast features as out of scope.

#### Scenario: Tournament organizations
- GIVEN MVP scope
- WHEN a professional tournament organization is requested
- THEN it is documented as out of scope for MVP

### Requirement: Post-launch success targets
Documented targets (not runtime gates) SHALL be:
- Sessions created per active club per month ≥ 4
- Player queue registration rate per session ≥ 80% of attendees
- Match review completion rate ≥ 60% without Que Master override
- Que Master session setup time < 5 minutes
- Waitlisted player response time after promotion < 10 minutes

#### Scenario: Targets are not gates
- GIVEN these numbers
- WHEN the product evaluates a live session
- THEN they are documented success targets
- AND they are not required as blocking validation in this spec

## Source

- `docs/business_logic/client_app/01_product_vision.md`
- `docs/business_logic.md`
- `docs/business_logic/README.md`
- `docs/business_logic/client_app/16_mvp_plan.md` (phase index only; not a behavior spec)
- `docs/business_logic/client_app/17_risks.md` (risk registry only; not a behavior spec)
