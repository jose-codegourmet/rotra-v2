# Tournament Specification

## Purpose

Documented Phase 3 tournament module: formats, skill-tier eligibility, administration, registration, EXP multipliers, and data-model accommodations.

## Status

**Documented intent — not implemented.** `docs/business_logic/client_app/11_tournament.md` is planned for Phase 3 and is not part of MVP.

## Actors

Club Owner, Tournament Admin (per tournament), players, umpires.

## Requirements

### Requirement: Formats
Planned formats SHALL include Single Elimination, Double Elimination, Round Robin, and Group Stage + Knockout.

#### Scenario: Format catalog
- GIVEN Phase 3 tournament design
- WHEN a Club Owner creates a tournament
- THEN they may choose one of the documented formats

### Requirement: Skill-tier eligibility
Tournaments MAY restrict entry by computed Skill Rating ranges (Open, Beginner 1.0–2.5, Intermediate 2.0–3.5, Advanced 3.0–5.0, Elite 4.0–5.0). Eligibility SHALL use computed Skill Rating, not self-declared playing level. Sandbagging-flagged players SHALL NOT enter tiers below their system-computed tier.

#### Scenario: Sandbagging blocks lower tier
- GIVEN a flagged player whose system tier is Advanced
- WHEN they register for Beginner
- THEN registration is refused

### Requirement: Administration
Club Owners SHALL create tournaments. A dedicated Tournament Admin MAY be assigned per tournament to set brackets, schedule matches, record scores, advance brackets, and publish results.

#### Scenario: Tournament Admin
- GIVEN a Club Owner assigned a Tournament Admin
- WHEN brackets need advancing
- THEN the Tournament Admin may advance them

### Requirement: Registration
Players SHALL register in-app. Doubles SHALL require pair registration. Fees MAY use the Cost System. Oversubscribed tournaments SHALL use FIFO waitlist. Registration SHALL close at a configured cutoff before start.

#### Scenario: Pair registration
- GIVEN a doubles tournament
- WHEN a player registers without a partner
- THEN pair registration is required

### Requirement: EXP multipliers
Tournament matches SHALL award EXP at: group/early ×1.5, quarterfinal ×2.0, semifinal ×2.5, final ×3.0, plus +100 EXP winner bonus.

#### Scenario: Final multiplier
- GIVEN a tournament final win
- WHEN EXP is awarded
- THEN the match EXP uses ×3.0 plus the +100 winner bonus if they win the tournament

### Requirement: MVP data-model accommodation
To avoid a later migration, the documented model SHOULD allow matches `source_type` session|tournament, nullable `tournament_id`, EXP `multiplier` default 1.0, and leaderboard `scope` session|club|tournament|global.

#### Scenario: Session match in MVP
- GIVEN an MVP session match
- WHEN it is stored
- THEN `tournament_id` may be null
- AND `source_type` may be session

## Source

- `docs/business_logic/client_app/11_tournament.md`
- `docs/business_logic/client_app/16_mvp_plan.md`
