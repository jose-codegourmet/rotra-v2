# Ubiquitous Language Specification

## Purpose

Canonical product vocabulary for ROTRA. This spec records documented naming and domain terms from `docs/business_logic/00_ubiquitous_language.md`. It is a language contract, not a claim that every defined concept is implemented.

## Status

**Documented product language.** Do not treat these terms as shipped features. Current implemented behavior lives in the matching Current specs (`auth-flow`, `clubs`, `queue-session`, and others).

## Actors

Player, Club Owner, Que Master, Umpire (Preset / On-the-fly; Authenticated / Quick Guest), Admin, Session host.

## Requirements

### Requirement: Brand and role spelling
Human-readable product copy SHALL use the brand **ROTRA** in all caps and the tagline **Run the game.** Role spelling SHALL be **Que Master** (not Queue Master). **Que Session** and **Que Schedule** SHALL be treated as synonyms for the same session record. Lowercase `rotra` MAY appear only in package names, filesystem paths, URL slugs, and database identifiers.

#### Scenario: Product-facing label
- GIVEN a player-facing screen that names the operator role
- WHEN the label is rendered
- THEN it uses "Que Master", not "Queue Master"

### Requirement: Four level concepts stay distinct
The product SHALL keep these concepts separate:
- **Playing level** — self-declared Beginner / Intermediate / Advanced
- **Skill Rating** — peer-computed 1.0–5.0 across six dimensions
- **MMR** — competitive ladder; default start 1000; floor 0; moves only on Club Que Session type MMR
- **Tier** — cosmetic EXP badge (Cadet through Titan); Apex / Apex Predator are position-based

**Rank** SHALL mean MMR bracket. **Position / Standing** SHALL mean numeric place on a leaderboard.

#### Scenario: Competitive session language
- GIVEN a Club Que Session with Session type MMR
- WHEN the product describes progression
- THEN it MAY say Competitive, Ranked, or MMR-eligible
- AND it MUST NOT call that the same thing as Skill Rating or Playing level

### Requirement: Session origin and type
**Club Que Session** SHALL be created under a club with required Session type `MMR` or `Fun Games`. **Friendly Que Session** SHALL be informal Regular (no Session type). EXP and MMR SHALL move only on Club Que Session — MMR. Skill-dimension ratings MAY apply on all session variants when matches complete. Do not call Friendly mode "Fun Games".

#### Scenario: Fun Games vs Friendly
- GIVEN a Club Que Session with Session type Fun Games
- WHEN copy describes the session
- THEN it uses "Fun Games"
- AND it MUST NOT label a Friendly Que Session as Fun Games

### Requirement: Match outcomes
Match states SHALL be `Active`, `Finalized`, `Completed`, and `Voided`. Product copy SHALL use **Voided**, never **Unscored**. Finalize SHALL mean umpire or Que Master submitted the final score. Complete SHALL mean expected reviews landed or the review window closed. Void SHALL reverse EXP and MMR attributed to that match.

#### Scenario: Voided match language
- GIVEN a Que Master voids a match
- WHEN the outcome is shown
- THEN the status is Voided
- AND the product does not call it Unscored

### Requirement: Rate and Review
The canonical CTA SHALL be **Rate and Review**. **Rating** is numeric 1–5 per skill dimension. **Review** is optional written comment. Player→Player written reviews SHALL be anonymous to the rated player. Que Master and authenticated Umpire Rate-and-Review SHALL be non-anonymous.

#### Scenario: Player review authorship
- GIVEN Player A reviews Player B after a match
- WHEN Player B reads the written review
- THEN the text is visible
- AND the author identity is hidden

## Source

- `docs/business_logic/00_ubiquitous_language.md`
- `docs/business_logic/README.md`
