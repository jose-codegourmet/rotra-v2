# Player Comparison Specification

## Purpose

Documented side-by-side comparison of two public player profiles, including H2H and partner records.

## Status

**Documented product rules** from `docs/business_logic/client_app/19_player_comparison.md`. Not implemented.

## Actors

Any authenticated player as viewer; two subject players. Public comparison URLs are documented as viewable without login.

## Requirements

### Requirement: Access
Any authenticated player MAY compare two publicly accessible players. They need not be one of the subjects. Entry points SHALL be a “Compare with…” control on a public profile and `/compare/{player_a_id}/{player_b_id}`. Player A and Player B SHALL resolve to the same canonical URL (lower UUID first). Self-comparison SHALL redirect to the player's profile. Missing players SHALL 404.

#### Scenario: Canonical pair URL
- GIVEN ids B then A where A sorts lower
- WHEN either order is requested
- THEN the canonical URL uses A then B

### Requirement: Public data only
Comparison SHALL surface only data already public on each profile. Gates (≥ 5 scored matches for overall stats, ≥ 5 external ratings per dimension, ≥ 20 matches for advanced stats) SHALL apply independently. Sandbagging flag SHALL never appear on comparison. Per-rater ratings SHALL not appear.

#### Scenario: One player under the stats gate
- GIVEN Player A has 12 scored matches and Player B has 2
- WHEN overall performance is shown
- THEN Player A stats render
- AND Player B cells show “Not enough data”

### Requirement: Head-to-head and partner
H2H and partner records SHALL be computed on demand from match history. Only Complete, non-voided, scored matches count. H2H requires the subjects on opposing teams. Partner record requires both on the same team. No minimum match gate; empty H2H SHALL show “No head-to-head matches yet”. Comparison SHALL be all-time, all-clubs.

#### Scenario: Opponents only
- GIVEN two players who faced each other three times and never partnered
- WHEN comparison loads
- THEN H2H shows 3 matches
- AND partner record shows no partner matches

### Requirement: Sharing
The comparison URL SHALL be shareable and SHALL generate an OG card (title “{A} vs {B}”, ratings and H2H summary, both photos). The URL SHALL not expire. The page is documented as public-readable.

#### Scenario: OG card
- GIVEN a canonical comparison URL
- WHEN OG tags are read
- THEN title includes both names

## Source

- `docs/business_logic/client_app/19_player_comparison.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
