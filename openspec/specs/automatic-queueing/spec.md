# Automatic Queueing Specification

## Purpose

Documented intelligent matchmaking engine that generates candidate matches for a Que Session. Distinct from Manual Queueing and from session waitlist FIFO.

## Status

**Documented product rules** from `docs/business_logic/client_app/automatic_queueing.md`. Not implemented. Numeric tuning constants are documented as `[configurable]` and are not invented here. Adaptive Mode is a future extension.

## Actors

Que Master, Club Owner, Player (read-only explanation when permitted), System.

## Requirements

### Requirement: Not a simple sorter
Automatic Queueing SHALL NOT function as a basic rank sorter, waiting-time sorter, or random selector. It SHALL determine who plays next, how players are grouped and teamed, whether the matchup fits the selected mode, fairness for current condition, waiting/rotation fairness, variety, carry burden, repetition, eligibility, and why the matchup was selected.

#### Scenario: Waiting time alone is insufficient
- GIVEN four prepared players with unequal waits and unequal strength
- WHEN a candidate is generated
- THEN the engine considers more than longest-wait pairing

### Requirement: Modes
Initial modes SHALL be Fun / Relaxed, Normal / Balanced, Training Style, and Overload Training. Manual Queueing SHALL always remain available. Hard eligibility rules SHALL NOT be overridable. Soft warnings MAY be overridden by the Que Master.

#### Scenario: Switch to manual
- GIVEN Automatic Queueing is enabled
- WHEN the Que Master chooses Manual Queueing
- THEN they can build matches without the engine

### Requirement: Candidate lifecycle
The engine SHALL generate candidate matches with teams, scores, warnings, and explanations. Candidates SHALL NOT start a match without Que Master approval unless Full Automatic Queueing is enabled in session settings (RULE-084). A candidate SHALL be invalidated when any included player's eligibility changes before approval, and MUST be re-validated before queue placement and match start (RULE-087).

#### Scenario: Player starts another match
- GIVEN a candidate includes Player A
- WHEN Player A becomes Playing before approval
- THEN that candidate is invalidated

### Requirement: Hard eligibility
Players who are Playing, Exited, or Suspended SHALL NOT appear in a generated candidate (RULE-085). Rotation-eligible statuses remain I Am Prepared, Waiting, and Resting only if the Que Master includes Resting.

#### Scenario: Exited excluded
- GIVEN a player is Exited
- WHEN candidates are generated
- THEN that player is omitted

### Requirement: Scoring dimensions
Documented player-level inputs SHALL include Effective Strength (next-match estimate, not permanent MMR), Rating Confidence, Challenge Index (0–10), Queue Priority (separate from skill), Fatigue and Readiness, Current Session Form, Recent Form, Match Difficulty History, Predicted Win Probability, and Match Suitability Score (0–100). Repeated-match warnings SHALL reduce suitability but SHALL NOT block approval (RULE-086).

#### Scenario: Repeated lineup
- GIVEN a candidate repeats a recent partnership
- WHEN it is scored
- THEN a repeated-match warning is shown
- AND the Que Master may still approve

### Requirement: Training roles
In Training Style or Overload Training, the stronger player SHALL be the Carrier and the lower-ranked partner the Development Player. Carry burden SHALL be tracked so stronger players are not assigned that role without bound.

#### Scenario: Training Style pair
- GIVEN a large strength gap under Training Style
- WHEN a candidate is generated
- THEN the stronger player is labeled Carrier

### Requirement: Voided matches and form
Voided matches SHALL NOT affect Automatic Queueing form calculations unless an explicit canonical exception is defined (RULE-088).

#### Scenario: Voided recent match
- GIVEN a player's last match was voided
- WHEN Recent Form is computed
- THEN that match is excluded

## Source

- `docs/business_logic/client_app/automatic_queueing.md`
- `docs/business_logic/client_app/08_queue_session.md`
- `docs/business_logic/client_app/18_canonical_rules.md`
