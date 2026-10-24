# Automatic Queueing (Canonical Feature Specification)

> **Canonical document.** This is the single source of truth for ROTRA **Automatic Queueing** — the intelligent badminton matchmaking engine. All related business-logic, database, and view documents must link here and must not contradict it.
>
> **Terminology:** See [`../00_ubiquitous_language.md`](../00_ubiquitous_language.md). Use **Que** for ROTRA session terminology; use **Queue** only for **Match Queue** behavior. Use **Automatic Queueing** for this feature — not "auto queue" or "smart queue."
>
> **Related docs:** [`08_queue_session.md`](./08_queue_session.md) · [`18_canonical_rules.md`](./18_canonical_rules.md) · [`06_skill_rating.md`](./06_skill_rating.md) · [`21_mmr_calibration.md`](./21_mmr_calibration.md) · [`../../database/03_queue_sessions.md`](../../database/03_queue_sessions.md) · [`../../database/04_matches.md`](../../database/04_matches.md) · [`../../views/client_app/que_master/que_master_console.md`](../../views/client_app/que_master/que_master_console.md)

---

## Table of contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Terminology](#2-terminology)
3. [Roles & Permissions](#3-roles--permissions)
4. [Feature Overview](#4-feature-overview)
5. [Player Matchmaking Model](#5-player-matchmaking-model)
6. [Effective Strength](#6-effective-strength)
7. [Rating Confidence](#7-rating-confidence)
8. [Challenge Index](#8-challenge-index)
9. [Queue Priority](#9-queue-priority)
10. [Fatigue and Readiness](#10-fatigue-and-readiness)
11. [Current Session Standing](#11-current-session-standing)
12. [Match Difficulty History](#12-match-difficulty-history)
13. [Predicted Win Probability](#13-predicted-win-probability)
14. [Match Suitability Score](#14-match-suitability-score)
15. [Candidate Match Generation](#15-candidate-match-generation)
16. [Fun / Relaxed Mode](#16-fun--relaxed-mode)
17. [Normal / Balanced Mode](#17-normal--balanced-mode)
18. [Training Style](#18-training-style)
19. [Overload Training](#19-overload-training)
20. [Carry Burden](#20-carry-burden)
21. [Match Variety & Repetition](#21-match-variety--repetition)
22. [Session Settings](#22-session-settings)
23. [Automatic Operating Levels](#23-automatic-operating-levels)
24. [Que Master Experience](#24-que-master-experience)
25. [Player Experience](#25-player-experience)
26. [Match Queue Integration](#26-match-queue-integration)
27. [Player-Request Integration](#27-player-request-integration)
28. [Manual Queueing](#28-manual-queueing)
29. [Realtime Behavior](#29-realtime-behavior)
30. [Concurrency](#30-concurrency)
31. [Validation](#31-validation)
32. [Hard Rules vs Soft Rules](#32-hard-rules-vs-soft-rules)
33. [Data Responsibilities](#33-data-responsibilities)
34. [API Responsibilities](#34-api-responsibilities)
35. [Explainability](#35-explainability)
36. [Edge Cases](#36-edge-cases)
37. [UI States](#37-ui-states)
38. [Accessibility](#38-accessibility)
39. [Analytics & Tuning](#39-analytics--tuning)
40. [Testing](#40-testing)
41. [Deferred Tuning Decisions](#41-deferred-tuning-decisions)
42. [Adaptive Mode — Future Extension](#42-adaptive-mode--future-extension)
43. [Match Start Eligibility](#43-match-start-eligibility)
44. [Cross-Document References](#44-cross-document-references)

---

## 1. Purpose & Scope

**Automatic Queueing** is ROTRA's intelligent badminton matchmaking engine. It must **not** function as a basic rank sorter, waiting-time sorter, or random Player selector.

The engine determines:

- Which Players should play next
- Which four Players should be grouped (doubles) or two Players (singles)
- How those Players should be divided into teams
- Whether the proposed match fits the selected **matchmaking mode**
- Whether the match is fair for the Players' current condition
- Whether the match respects waiting time and rotation fairness
- Whether the match provides variety
- Whether a stronger Player is being assigned an appropriate carry burden
- Whether the match is too repetitive
- Whether all selected Players are eligible and ready
- **Why** ROTRA selected the matchup

### Core design principle

> Automatic Queueing must not only ask whether two teams are equal. It must determine whether this is the **right type of match** for these Players at this moment.

### In scope

- Player-level matchmaking dimensions (Effective Strength, Rating Confidence, Challenge Index, Queue Priority, Fatigue and Readiness)
- Candidate generation, scoring, explanation, and Que Master controls
- Four initial matchmaking modes: Fun / Relaxed, Normal / Balanced, Training Style, Overload Training
- Coexistence with Manual Queueing and Request a Match
- Session settings, data snapshots, decision records, validation, edge cases, UI states

### Out of scope

- Application code implementation (separate task)
- Final approved numeric tuning constants (documented as `[configurable]` recommended defaults)
- **Adaptive Mode** (future extension — see §42)

---

## 2. Terminology

| Term | Definition |
| ---- | ---------- |
| **Automatic Queueing** | ROTRA's intelligent matchmaking feature. Generates **candidate matches** for Que Master review or automatic Match Queue placement. |
| **Manual Queueing** | Que Master builds or modifies matches without Automatic Queueing. Always available. |
| **Matchmaking mode** | One of: Fun / Relaxed, Normal / Balanced, Training Style, Overload Training. |
| **Candidate match** | A generated lineup with teams, scores, warnings, and explanation — not yet approved or queued. |
| **Proposed match** | Synonym for candidate match before approval. |
| **Active match** | A match with `status = active` on a court. |
| **Effective Strength** | Estimated Player strength **for the next match** — not permanent MMR or Skill Rating. |
| **Rating Confidence** | How reliable ROTRA considers the strength estimate. Not a strength bonus. |
| **Challenge Index** | Temporary target for how difficult the Player's next match should be (0–10). |
| **Queue Priority** | How urgently a Player needs a match — separate from skill. |
| **Fatigue and Readiness** | Whether a Player should be selected now. |
| **Match Suitability Score** | Overall quality score (0–100) for a candidate under the selected mode. |
| **Team Balance** | Predicted competitiveness between teams. |
| **Carry burden** | How often a Player has been expected to carry weaker partners. |
| **Carrier** | The stronger Player in a Training Style or Overload Training matchup. |
| **Development Player** | The lower-ranked partner in a Training Style matchup. |
| **Repeated-match warning** | Advisory alert when a lineup repeats recent partnerships or opponents. |
| **Predicted win probability** | Estimated chance each team wins, e.g. 52% / 48%. |
| **Current Session Form** | Performance adjustment within the active Que Session. |
| **Recent Form** | Performance adjustment across recent valid matches. |
| **Match Difficulty History** | Per-Player record of how difficult recent matches were for that individual. |

**Do not** use "queue" and "que" interchangeably. **Que Session** = the ROTRA session. **Match Queue** = ordered upcoming matches.

---

## 3. Roles & Permissions

| Role | Automatic Queueing permissions |
| ---- | ------------------------------ |
| **Que Master** | Enable/disable/pause Automatic Queueing; configure session settings; generate, approve, reject, regenerate candidates; view alternatives; swap/lock Players; lock teams; override warnings; change mode; switch to Manual Queueing |
| **Club Owner** | Same as Que Master on managed sessions; additionally assigns Que Masters |
| **Player** | May see simplified match explanation when session permits; cannot approve or modify candidates |
| **System** | Calculates matchmaking context; generates candidates; invalidates stale candidates; records decision snapshots |

Hard eligibility rules cannot be overridden by any role. Soft warnings may be overridden by Que Master.

---

## 4. Feature Overview

Automatic Queueing generates the best available badminton matchup using:

1. Player eligibility
2. Player readiness
3. Waiting fairness
4. Number of games played
5. Current Player strength (Effective Strength)
6. Recent performance (Recent Form, Current Session Form)
7. Rating confidence
8. Fatigue
9. Match difficulty history
10. Partner variety
11. Opponent variety
12. Carry burden
13. Selected matchmaking mode
14. Repeated-match warnings
15. Que Master settings
16. Match Queue constraints

Every generated match includes a **human-readable explanation**. Automatic Queueing remains **controlled by the Que Master**. It may recommend, propose, or (when configured) automatically place a match into the Match Queue.

The Que Master may always: approve, reject, regenerate, modify Players, swap Players, lock Players, lock teams, select alternatives, override warnings, switch mode for the next match, or use Manual Queueing.

---

## 5. Player Matchmaking Model

Do **not** represent a Player using one simple number. Automatic Queueing evaluates each Player through **five independent dimensions**:

| Dimension | Purpose | Must not be conflated with |
| --------- | ------- | -------------------------- |
| **Effective Strength** | How strong for the next match | Permanent MMR, Tier, Skill Rating |
| **Rating Confidence** | How reliable the strength estimate is | Strength bonus |
| **Challenge Index** | How difficult the next match should be | Player skill |
| **Queue Priority** | How urgently they need a match | Skill or strength |
| **Fatigue and Readiness** | Whether they should play now | Queue Priority |

### Separation rules

- Match history increases **Rating Confidence** — not automatically Effective Strength.
- Winning repeatedly increases **Current Session Form** and **Challenge Index** — not permanent skill without the normal rating process.
- Waiting longer increases **Queue Priority** — not Player strength.
- Difficult matches affect **Challenge Index**, **Fatigue**, and **Match Difficulty History** — not permanent rating directly.
- **EXP** and **Tier** are cosmetic (RULE-040) — must not feed Queue Priority or Effective Strength.
- **Calibration status** does not affect Queue Priority (RULE-074).

---

## 6. Effective Strength

### 6.1 Purpose

**Effective Strength** estimates how strong a Player is **for the next match**. It is not necessarily the same as permanent MMR, Skill Rating, ROTRA Tier, temporary session skill level, session standing, or career win rate.

Conceptually:

```text
Effective Strength =
  Base Strength
+ Recent Form Adjustment
+ Current Session Adjustment
- Fatigue Adjustment
+ Other Temporary Context Adjustments
```

The exact production formula is `[configurable]`.

### 6.2 Base Strength

When MMR, Tier, or Skill Rating systems are available, use the appropriate source as primary Base Strength per migration rules (§6.7).

**Until then**, use temporary session skill levels assigned by the Que Master:

| Temporary skill level | Base Strength `[recommended default]` |
| --------------------- | ------------------------------------: |
| Beginner Low | 1 |
| Beginner Mid | 2 |
| Beginner High | 3 |
| Intermediate Low | 4 |
| Intermediate Mid | 5 |
| Intermediate High | 6 |
| Advanced Low | 7 |
| Advanced Mid | 8 |
| Advanced High | 9 |
| Professional | 10 |

### 6.3 Recent Form Adjustment

Recent Form reflects performance above or below expectations — not raw wins alone.

Conceptually:

```text
Recent Form Adjustment = Actual Performance - Expected Performance
```

Consider: wins, losses, expected win probability, team composition, opponent strength, score margin when available, carry role, Development Player role, match difficulty, match format, voided matches (excluded unless canonical exception).

### 6.4 Time windows `[configurable]`

| Window | Recommended weight |
| ------ | -----------------: |
| Current Que Session | 40% |
| Last 5 valid matches | 35% |
| Last 20 valid matches | 15% |
| Long-term rating trend | 10% |

### 6.5 Adjustment limits `[configurable]`

| Limit | Recommended default |
| ----- | ------------------: |
| Maximum upward adjustment | +0.75 skill-level equivalent |
| Maximum downward adjustment | −0.75 skill-level equivalent |

### 6.6 Highest-ranked Player rule

Do **not** add an extra strength point because the Player is the highest-ranked in a candidate. Rank is already in Base Strength and Effective Strength. Adding another point double-counts.

### 6.7 Future migration path

When dedicated systems ship:

1. **MMR** — primary Base Strength for Club Que Session — MMR
2. **Skill Rating** — dimension-weighted composite for general strength
3. **Tier / verified playing level** — display and eligibility only unless explicitly approved for matchmaking
4. Temporary session skill levels remain fallback for sessions without rated history

---

## 7. Rating Confidence

### 7.1 Purpose

**Rating Confidence** measures how reliable ROTRA considers the Player's strength estimate. It is **not** a strength bonus.

Example: two Players with Effective Strength 7.0 — one at 95% confidence, one at 30% — the engine treats the second as more uncertain.

### 7.2 Factors

- Number of valid matches
- Recency of match history
- Consistency of performance
- Matches against rated Players
- Opponent and partner variety
- Manually assigned skill
- Calibration completion
- Volatile result history

### 7.3 Low-confidence behavior

When confidence is low:

- Avoid extreme Overload Training assignments
- Prefer Balanced or controlled Training matches
- Avoid treating uncertain Players as reliable Carriers
- Allow Que Master override
- Label uncertainty in explanation

Example explanation:

> Player strength estimate has low confidence because only two rated matches are available.

### 7.4 Match history rule

High match count increases **Rating Confidence** — not Effective Strength or Challenge Index by itself.

---

## 8. Challenge Index

### 8.1 Purpose

**Challenge Index** (recommended range 0–10) is a temporary matchmaking target — not Player skill.

- **Low** — recovery, lighter, or balanced match due
- **High** — challenging, carry, or overload match due

### 8.2 Components `[configurable ranges]`

| Component | Recommended range | Examples |
| --------- | ----------------: | -------- |
| Recent overperformance | 0–3 | Below expectation: 0; dominating: 3 |
| Current Session standing | 0–2 | Average: 0; leading: 2 |
| Easy-match debt | 0–2 | Recent hard match: 0; consistently easy: 2 |
| Rest and readiness | 0–1 | Fatigued: 0; rested: 1 |
| Under-challenged streak | 0–2 | Recent hard matches: 0; comfortable wins: 2 |

### 8.3 Example

```text
Recent overperformance:     3
Current Session standing:   2
Easy-match debt:            2
Rested and ready:           1
Under-challenged streak:    2
                           ---
Challenge Index:           10
```

### 8.4 Decrease triggers

Challenge Index decreases when the Player: completed a hard match, completed overload, lost a difficult carry match, has high fatigue, carried repeatedly, received little recovery, or is underperforming vs expectation.

### 8.5 Avoid double counting

Do not add Challenge Index points because the Player is highest-ranked or has large match history. Rank → Effective Strength. History → Rating Confidence.

---

## 9. Queue Priority

### 9.1 Purpose

**Queue Priority** determines who most urgently needs a match. Separate from skill.

May consider: waiting duration, time since last match, games played this session, times skipped, just joined rotation, cancelled/invalidated match, fewer matches than others, I Am Prepared status, temporary unavailability.

### 9.2 Core fairness rules

Prefer Players who: waited longer, played fewer games, were skipped, have not played recently, are eligible and prepared.

**Hard rule:** waiting fairness must not override eligibility. Long-waiting Players who are Playing, Exited, Suspended, not in session, not eligible, not I Am Prepared (when required), Resting, or Eating must not be inserted.

### 9.3 Queue starvation protection `[configurable]`

- Increase Queue Priority after every skipped rotation
- Apply skip bonus
- Require inclusion after threshold unless no valid matchup exists
- Show warning when Player is at risk of starvation

---

## 10. Fatigue and Readiness

### 10.1 Purpose

Determines whether a Player should be selected **now**.

May consider: time since last match, consecutive matches, session match count, recent difficulty, carry burden, overload assignments, player status, Que Master override, Player-declared readiness.

### 10.2 Player status gating

| Normally eligible | Normally ineligible |
| ----------------- | ------------------- |
| I Am Prepared, Waiting | Playing, Resting, Eating, Suspended, Exited, Not Arrived, I Am In without I Am Prepared |

Canonical session rules determine whether I Am Prepared is required (RULE-017).

### 10.3 Consecutive games `[configurable]`

Penalize or prevent back-to-back assignments without sufficient rest. Que Master may override when Player agrees, session permits, insufficient Players, or deliberate training sequence.

### 10.4 Carry fatigue

Carrying a lower-ranked partner contributes more fatigue than a balanced match. Overload Training contributes even more.

---

## 11. Current Session Standing

### 11.1 Purpose

How the Player is performing during the **active Que Session**.

May consider: wins, losses, expected vs actual, score margins, opponent/partner strength, carry assignments, match difficulty, match count, streak, quality of performance.

### 11.2 Avoid raw win-rate bias

Do not rank by raw session win rate alone. Expected-loss carry assignments and upset wins must be weighted appropriately.

### 11.3 Minimum sample warning

Show low-confidence warning when based on very few games.

---

## 12. Match Difficulty History

### 12.1 Purpose

Per-Player difficulty of recent matches. The same match may classify differently per participant.

Example: Advanced + Beginner vs Intermediate + Intermediate — Advanced: carry/high burden; Beginner: developmental; Intermediates: balanced.

### 12.2 Values `[recommended]`

| Qualitative | Numeric |
| ----------- | ------: |
| Very Easy | −2 |
| Easy | −1 |
| Balanced | 0 |
| Hard | +1 |
| Very Hard | +2 |

### 12.3 Uses

Influences Challenge Index, Fun / Relaxed rhythm, recovery selection, carry/overload assignment, fatigue, variety, Que Master explanations.

---

## 13. Predicted Win Probability

### 13.1 Purpose

Every candidate team split receives predicted win probability (e.g. Team A 52%, Team B 48%).

Uses: Effective Strength, Rating Confidence, team composition, internal skill gap, Recent Form, match format, carry burden, session context.

### 13.2 Team composition

Do not evaluate teams by summing two ratings only. Advanced + Beginner may not behave like Intermediate + Intermediate at equal combined strength.

Consider: total strength, strongest/weakest Player, internal gap, carrier responsibility, partnership history, compatibility when history exists.

### 13.3 Confidence

Expose prediction confidence to Que Master: High / Medium / Low. Low when new Players, manual ratings, little history, or volatile form.

---

## 14. Match Suitability Score

### 14.1 Purpose

Every valid candidate receives a **Match Suitability Score** (0–100). Highest score = best match under selected mode.

Conceptually:

```text
Match Suitability Score =
  Team Balance
+ Mode Fit
+ Queue Fairness
+ Player Readiness
+ Match Variety
+ Training Value
+ Challenge Rhythm
- Fatigue Penalty
- Repetition Penalty
- Carry Burden Penalty
- Risk Penalty
```

Each mode applies **different weights** (§16–§19). Not one universal formula.

### 14.2 Minimum candidate quality `[configurable]`

When no candidate reaches threshold:

- Do not silently create a poor match
- Tell Que Master no ideal match is available
- Show best alternatives with compromise explanation
- Allow override or wait for more Players

---

## 15. Candidate Match Generation

### Step 1 — Determine eligible Players

**Exclude:** Playing, Exited, Suspended, not in session, not admitted, not ready, conflicting assignment.

**Temporarily exclude:** Resting, Eating, not I Am Prepared.

### Step 2 — Rank by Queue Priority

Begin with Players most in need of a match.

### Step 3 — Build candidate groups

Doubles: groups of 4. Singles: groups of 2. Use bounded generation — not exhaustive combinatorics on large pools.

Recommended strategy:

1. Start with highest-priority Player
2. Select compatible pool around them
3. Generate groups from pool
4. Repeat for other high-priority Players
5. Retain top candidates

### Step 4 — Generate team splits

For four doubles Players A, B, C, D — evaluate all three unique splits:

```text
A+B vs C+D
A+C vs B+D
A+D vs B+C
```

### Step 5 — Score every valid split

Calculate: predicted probability, team balance, mode fit, queue fairness, variety, fatigue, carry burden, training value, challenge rhythm, repetition, eligibility, Match Suitability Score.

### Step 6 — Reject invalid candidates

Reject: duplicate Player, ineligible Player, active/overlapping assignment, invalid team size, invalid format, hard rule violations.

### Step 7 — Select candidate

Highest-scoring valid candidate meeting quality threshold.

### Step 8 — Explain the decision

Human-readable explanation with balance, fairness, challenge, variety, fatigue, and mode fit reasons.

---

## 16. Fun / Relaxed Mode

### Purpose

Variety and pleasant challenge rhythm — not only easy matches. Rhythm example: Challenging → Balanced → Lighter → Challenging.

### Scoring priorities `[configurable]`

| Component | Recommended weight |
| --------- | -----------------: |
| Challenge Rhythm | 30% |
| Match Variety | 25% |
| Reasonable Balance | 20% |
| Queue Fairness | 15% |
| Fatigue and Rest | 10% |

### Balance range `[configurable]`

Recommended: **35%–65%** predicted win probability. May vary by Challenge Index.

### Recovery match

Lighter matchup after difficult matches — not punishment for lower-ranked Players. Still protect from meaningless games.

---

## 17. Normal / Balanced Mode

### Purpose

Closest practical competition. Target: **45%–55%** predicted win probability.

### Scoring priorities `[configurable]`

| Component | Recommended weight |
| --------- | -----------------: |
| Team Balance | 55% |
| Queue Fairness | 15% |
| Match Variety | 15% |
| Fatigue and Readiness | 10% |
| Recent Form Correction | 5% |

### Tie breaking

1. Longer-waiting Players
2. Fewer games played
3. New partnerships
4. New opponents
5. Sufficient rest
6. Avoid same exact lineup

---

## 18. Training Style

### Purpose

Deliberate carry matchup: stronger Player + lower-ranked Player vs two middle-ranked opponents.

Example: Advanced + Beginner vs Intermediate + Intermediate.

**Carrier** = stronger Player. **Development Player** = lower-ranked partner.

### Target balance `[configurable]`

Carrier team predicted win probability: **40%–55%**.

### Carrier selection

Prefer: sufficient Effective Strength, Rating Confidence, rest, no recent carry, session stability.

Avoid: just carried, just overload, fatigued, low confidence, below-expectation form, repeated carry.

### Development Player selection

Prefer: lower-ranked than Carrier, ready, not overwhelmed repeatedly, benefits from matchup, not repeated same Carrier.

### Scoring priorities `[configurable]`

| Component | Recommended weight |
| --------- | -----------------: |
| Carry Matchup Fit | 35% |
| Predicted Competitiveness | 25% |
| Development Value | 15% |
| Queue Fairness | 10% |
| Carrier Burden Fairness | 10% |
| Match Variety | 5% |

---

## 19. Overload Training

### Purpose

Controlled pressure — strong Player carries Beginner vs two strong opponents. Example: Advanced + Beginner vs Advanced + Advanced.

Canonical name: **Overload Training** (not "Unfair Training Style" in UI).

### Target probability `[configurable]`

Carrier team: **25%–40%**. Minimum productive: **15%–20%**. Below minimum → non-productive unless Que Master explicitly approves.

### Limits

Avoid: consecutive overload, overload immediately after carry, same Carrier/Development Player repeatedly, low-confidence Carriers, fatigued Carriers.

### Session limits `[configurable]`

Max overload per Player per session, minimum rest after overload, minimum Rating Confidence, minimum Effective Strength, minimum probability, consecutive carry controls.

### Scoring priorities `[configurable]`

| Component | Recommended weight |
| --------- | -----------------: |
| Overload Target Fit | 35% |
| Carrier Capability | 20% |
| Development Value | 15% |
| Carrier Burden Fairness | 15% |
| Player Readiness | 10% |
| Match Variety | 5% |

### Visibility

Que Master sees: Overload Training, Hard Carry, High Intensity, Deliberate Challenge labels.

---

## 20. Carry Burden

Tracks how often a Player was expected to carry. Considers: carry count, consecutive carries, overload count, partner skill gap, match difficulty, time since last carry, session duration, fatigue.

### Fairness `[configurable]`

Recommended: avoid same Player as Carrier in more than **two consecutive** matches.

### Que Master override

Override allowed. Explanation must show recent carry count, consecutive count, overload count, rest received, and warning reason.

---

## 21. Match Variety & Repetition

### Variety factors

Reward: new partners, new opponents, different splits, Players who have not met recently, session-wide social variety.

### Repetition detection `[configurable lookback]`

Detect: exact four-Player lineup, same teams, same partnership, same opponents, repeated matchup within recent matches.

### Warning-only rule

Consistent with Que Session repeated-match setting (§22, [`08_queue_session.md`](./08_queue_session.md) §18.9):

- Show warning
- Reduce Match Suitability Score
- Do **not** automatically block approval
- Que Master override always allowed

Example:

> This lineup contains the same partnership used two matches ago. The match remains eligible, but Player variety is low.

---

## 22. Session Settings

| Setting | Purpose | Default | Allowed values | Who edits | Editable while Active | Feed | Notification | Player visible |
| ------- | ------- | ------- | -------------- | --------- | --------------------- | ---- | ------------ | -------------- |
| Automatic Queueing enabled | Turn feature on/off | Off | On / Off | Host | Yes | Yes | No | No |
| Automatic Queueing mode | Default matchmaking mode | Normal / Balanced | Fun / Relaxed, Normal / Balanced, Training Style, Overload Training | Host | Yes | Yes | No | When match shown |
| Automatic placement into Match Queue | Full auto without manual approve | Off | On / Off | Host | Yes | Yes | Optional | No |
| Que Master approval required | Candidate needs approve before queue | On | On / Off | Host | Yes | No | No | No |
| Minimum Match Suitability Score | Quality floor | `[configurable]` | 0–100 | Host | Yes | No | No | No |
| Repetition warning enabled | Advisory repetition alerts | On | On / Off | Host | Yes | No | No | No |
| Carry burden limit | Max consecutive carries | `[configurable]` | 1–N | Host | Yes | No | No | No |
| Maximum consecutive games | Back-to-back limit | `[configurable]` | 1–N | Host | Yes | No | No | No |
| Minimum rest requirement | Rest between matches | `[configurable]` | Duration | Host | Yes | No | No | No |
| Overload Training allowed | Permit overload mode | Off | On / Off | Host | Yes | Yes | No | When match shown |
| Overload limit per Player | Session cap | `[configurable]` | 0–N | Host | Yes | No | No | No |
| Low-confidence Player restrictions | Block overload for uncertain ratings | On | On / Off | Host | Yes | No | No | No |
| Match explanation visibility | Players see simplified reason | Off | Off / Summary / Full (QM only) | Host | Yes | No | No | Configurable |
| Alternative candidate count | Alternatives shown | `[configurable]` 3–5 | 1–10 | Host | Yes | No | No | No |
| Next-match mode override | One-match mode change | None | Any mode | Host | Yes (resets after use) | Yes | No | When match shown |
| Queue starvation threshold | Skips before forced inclusion | `[configurable]` | 1–N | Host | Yes | No | Warning to QM | No |
| Operating level | Recommend / Assisted / Full Auto | Recommend Only | See §23 | Host | Yes | Yes | No | No |

Defaults marked `[configurable]` are recommended values — not permanent canonical constants until approved.

All setting changes create Session Feed entries per [`08_queue_session.md`](./08_queue_session.md) §26.

---

## 23. Automatic Operating Levels

| Level | Behavior |
| ----- | -------- |
| **Recommend Only** | ROTRA generates candidates; Que Master manually approves and places |
| **Assisted Queueing** | Best match prepared for approval; Que Master may modify, regenerate, choose alternative |
| **Full Automatic Queueing** | Auto-add to Match Queue when threshold met, Players eligible, no hard conflict, setting allows. Que Master may still cancel, modify queue, pause, or switch to Manual |

Full Automatic Queueing is **optional** and off by default.

---

## 24. Que Master Experience

### Automatic Match Card

Shows: match mode, Team A, Team B, skill indicators, Effective Strength, predicted probability, prediction confidence, Match Suitability Score, intensity, queue fairness, carry burden, variety, repetition warnings, readiness, explanation.

Example:

```text
AUTO MATCH — TRAINING STYLE

TEAM A: Advanced High + Beginner Mid
TEAM B: Intermediate High + Intermediate High

Predicted balance: 47% / 53%
Prediction confidence: High
Match Suitability: 89 / 100
Intensity: High
Carrier burden: Acceptable
Player variety: Excellent
```

### Explanation block

Bullet reasons: balance, waiting fairness, challenge target, variety, fatigue, training value, confidence caveats.

### Que Master actions

Approve Match · Add to Match Queue · Regenerate · View Alternatives · Swap Player · Lock Player · Lock Team · Change Mode · Override Warning · Reject Candidate · Pause Automatic Queueing · Switch to Manual Queueing

### Lock Player

Locked Player remains in regenerated candidates; engine finds alternatives around them.

### Lock Team

Locked team stays together while engine searches for opponents.

### Alternatives `[configurable]` 3–5

Each shows: Match Suitability Score, predicted probability, mode fit, queue fairness, warnings, explanation.

See [`../../views/client_app/que_master/que_master_console.md`](../../views/client_app/que_master/que_master_console.md).

---

## 25. Player Experience

When session permits, Players may see simplified: match mode, intensity, teams, general reason, training/recovery/challenge labels, simplified balance meter.

**Do not expose:** exact confidence values, internal risk penalties, harmful labels ("weak Player," "liability," "easy opponent").

Recommended tags: Balanced, Training Match, Recovery Match, High Intensity, New Partner, Challenge Match, Carry Match, Boss Fight, Longest Waiting.

### Balance meter

```text
Team A Favored ─── Balanced ─── Team B Favored
                         ▲
                      52 / 48
Confidence: Medium
```

See [`../../views/client_app/player/player_session_view.md`](../../views/client_app/player/player_session_view.md).

---

## 26. Match Queue Integration

Approved automatic candidates enter the Match Queue with normal `queue_position` ordering — no automatic front insertion unless Que Master places them there.

Queued automatic matches preserve `aq_origin = automatic` and full decision snapshot.

Revalidation required before match start (§43).

---

## 27. Player-Request Integration

Coexists with **Request a Match** ([`08_queue_session.md`](./08_queue_session.md) §18, RULE-080).

- Player requests do not override Queue Priority
- Do not automatically jump ahead
- Require Que Master approval
- Follow Match Queue order
- May receive Match Suitability Score and warnings
- Que Master may compare player request vs automatic candidate vs alternatives
- Player request may be approved despite lower suitability — show reason

---

## 28. Manual Queueing

Always available. Que Master may disable or pause Automatic Queueing and build matches manually.

Manual actions still show warnings for: repetition, extreme imbalance, fatigue, carry burden, queue starvation, conflicting assignments.

Warnings do not silently block unless hard validity rule violated.

See [`../../views/client_app/que_master/que_master_add_match.md`](../../views/client_app/que_master/que_master_add_match.md).

---

## 29. Realtime Behavior

Backend is authoritative. Recalculate when: Player status changes, match completion/cancellation, score correction, arrival/preparation/rest/exit, new match request, Que Master override, Match Queue change, rating update, session setting update, capacity update.

On change: recalculate affected candidates, invalidate stale candidates, preserve approved matches unless invalid, notify Que Master when recommendation outdated.

On reconnect: resync statuses, Match Queue, active matches, settings; recalculate validity; do not trust stale client scoring.

---

## 30. Concurrency

Protect against:

- Two Que Masters approving overlapping matches
- Overlapping court starts
- Player status change during approval
- Simultaneous Automatic and Manual Match Queue edits
- Player exit during generation
- Match completion updating form while candidate open
- Mode change during generation
- Multiple candidate approvals
- Duplicate automatic generation
- Stale predicted probabilities

Authoritative backend validation before: approval, queue placement, match start. Last-write-wins for concurrent Que Master edits per existing session policy.

---

## 31. Validation

| Category | Examples |
| -------- | -------- |
| Player count | Correct for format (4 doubles / 2 singles) |
| Uniqueness | No duplicate Player per match |
| Admission | Valid admission and readiness |
| Conflicts | No overlapping active/queued assignment |
| Format | Valid session format and mode |
| Locks | Valid locked Player/team in regeneration |
| Freshness | Candidate not stale at approval |
| Permissions | Valid Que Master action |
| Session state | Active session required for generation |

Hard failures block approval. Soft warnings allow override.

---

## 32. Hard Rules vs Soft Rules

### Hard rules (cannot override)

- Duplicate Player in one match
- Exited / Suspended / Playing Player in candidate
- Invalid team size or session format
- Conflicting active assignment
- Stale or invalid candidate at approval
- Unauthorized Que Master action
- Wrong session state

See RULE-084–RULE-088 in [`18_canonical_rules.md`](./18_canonical_rules.md).

### Soft rules (Que Master may override)

- Repeated partner/opponent
- Match imbalance
- Low Rating Confidence
- High carry burden
- Short rest
- Queue Priority concern
- Overload intensity
- Low Match Suitability Score

Show soft warnings clearly in UI and explanation.

---

## 33. Data Responsibilities

### Session-level (see [`../../database/03_queue_sessions.md`](../../database/03_queue_sessions.md))

Automatic Queueing settings, default mode, next-match override, operating level.

### Match-level decision record (see [`../../database/04_matches.md`](../../database/04_matches.md))

Mode, timestamps, Players, teams, Effective Strength snapshots, Rating Confidence snapshots, Challenge Index snapshots, Queue Priority snapshots, fatigue snapshots, predicted probability, prediction confidence, Match Suitability Score, component scores, warnings, explanation, alternatives considered, Que Master action, overrides, manual modifications, final result.

### Per-Player at generation

Effective Strength, Rating Confidence, Challenge Index, Queue Priority, Fatigue, Current Session Form, Recent Form, Match Difficulty History snapshot, carry role if applicable.

Store enough snapshot data to explain historical decisions when ratings change later.

Voided matches do not affect form unless explicit exception (RULE-088).

---

## 34. API Responsibilities

Logical operations (route naming follows existing API conventions):

| Operation | Responsibility |
| --------- | -------------- |
| Fetch Automatic Queueing settings | Return session AQ config |
| Update Automatic Queueing settings | Validate permissions and Active-state rules |
| Generate best candidate | Run full pipeline §15 |
| Generate alternatives | Return top N candidates |
| Generate around locked Player | Regenerate with lock constraint |
| Generate around locked team | Regenerate with team lock |
| Approve candidate | Validate freshness; place in queue or mark approved |
| Reject candidate | Discard with audit |
| Modify candidate | Swap Players; re-score |
| Add candidate to Match Queue | Assign queue_position |
| Invalidate candidate | Mark stale with reason |
| Explain candidate | Return explanation payload |
| Fetch Player matchmaking context | Return five dimensions for Player |
| Pause / Resume Automatic Queueing | Session flag |
| Change mode | Update default or next-match override |
| Record Que Master override | Audit soft-rule overrides |
| Fetch matchmaking history | Decision records for session |

Server validates all transitions. Permissions: Que Master and Club Owner on managed sessions.

---

## 35. Explainability

Do not show only `Match Score: 87`. Show meaningful reasons in categories:

- Balance · Queue fairness · Recent performance · Challenge target · Recovery need · Carry burden · Match variety · Fatigue · Training value · Repetition · Rating confidence

### Avoid harmful language

| Do not use | Prefer |
| ---------- | ------ |
| Weak Player, Bad Player, Liability | Development Player, Higher-ranked Player |
| Easy opponent, Unskilled | Recovery match, Challenge match |
| Burden (player-facing) | Carry assignment, Training pairing |

---

## 36. Edge Cases

### Player availability

Exactly four eligible; fewer than four; odd count; status changes during generation; manual assignment elsewhere; reconnect with stale status.

### Rating and confidence

New Player; manually assigned skill; inflated win rate vs weak opponents; low win rate vs strong; volatile Player; missing rating; rating changes after generation.

### Queue fairness

High-priority Player cannot form valid match; repeated skips; balanced match excludes longest waiter; long waiter causes moderate imbalance; unequal games played.

### Mode-specific

Fun / Relaxed: hard-match streak, easy-match streak, no lighter matchup. Balanced: nothing in 45–55%. Training: no Carrier, low confidence Carrier, repeated Carrier+Development. Overload: below minimum probability, fatigued Carrier, limit reached.

### Match Queue

Stale candidate during approval; overlapping approvals; invalid queued match; conflict with player request; manual insert ahead; paused Automatic Queueing; mode change with open candidates.

### Match results

Voided match; score correction; late result; form recalculation changes recommendations.

For each: document hard block vs soft warning vs Que Master override in implementation.

---

## 37. UI States

| State | Description |
| ----- | ----------- |
| Automatic Queueing disabled | Feature off; Manual Queueing only |
| Automatic Queueing paused | Temporarily suspended |
| Generating candidate | Loading indicator |
| Candidate ready | Primary card displayed |
| Alternatives ready | Side panel or sheet |
| No eligible Players | Empty pool message |
| Not enough Players | Fewer than required for format |
| No quality candidate | Below threshold; show alternatives |
| Candidate stale | Revalidate prompt |
| Candidate invalid | Hard rule failure; regenerate |
| Candidate approved | Awaiting or completed queue placement |
| Candidate queued | In Match Queue |
| Que Master override | Warning dismissed with audit |
| Mode changed | Default or next-match override active |
| Player locked | Lock icon on card |
| Team locked | Team lock indicator |
| Repetition warning | Advisory badge |
| Low-confidence warning | Uncertainty badge |
| Carry-burden warning | Fatigue/fairness badge |
| Fatigue warning | Rest recommendation |
| Queue-starvation warning | Fairness alert |
| Backend error | Retry with last-known state |
| Realtime reconnecting | Offline banner; pause auto-approve |

---

## 38. Accessibility

- Do not rely on color alone for balance meter
- Text labels for meters and warnings
- Keyboard controls for Que Master actions
- Accessible warning descriptions
- Announce candidate changes (respect user preference)
- Explain uncertainty in text
- Avoid rapid unsolicited UI changes
- Confirmation for approval and high-risk overrides

---

## 39. Analytics & Tuning

Possible metrics (not public per-Player analytics):

- Candidates generated, approval/modification/rejection rates, override rate
- Average Match Suitability Score and predicted balance
- Actual upset rate vs prediction
- Queue waiting-time and match-count fairness distributions
- Carrier and overload assignment distributions
- Repeated-match warning rate
- Prediction calibration by mode
- Automatic vs manual match ratio

Use for tuning weights, thresholds, fatigue rules, carry limits — not for public Player shaming.

---

## 40. Testing

### Unit-level

Effective Strength adjustment, Rating Confidence, Challenge Index, Queue Priority, Fatigue, repetition detection, team-split generation, probability calculation, mode-fit scoring, Match Suitability Score, carry burden.

### Integration

Status changes, match completion, candidate generation, approval, queue insertion, invalidation, realtime sync, manual override, player-request comparison.

### Scenario tests

**A — Balanced:** Four Intermediate Low/Mid Players → ~50% split; Queue Priority tie-break.

**B — Training:** Advanced High + Beginner Mid vs two Intermediate High → Training label; carrier burden check; competitive target.

**C — Overload:** Advanced High + Beginner High vs Advanced Low + Advanced Mid → deliberate difficulty; overload warning; fatigue check.

**D — Recovery:** Player after overload + hard carry + close loss → Fun / Relaxed lowers difficulty; recovery recommendation.

**E — Queue starvation:** Repeatedly skipped Player → Queue Priority increases; explanation mentions waiting fairness.

---

## 41. Deferred Tuning Decisions

The following are **`[configurable]` recommended defaults** — not permanent rules until approved:

- Recent Form time-window weights (40/35/15/10%)
- Effective Strength adjustment cap (±0.75)
- Challenge Index component weights and ranges
- Queue starvation threshold
- Minimum rest duration
- Maximum consecutive games
- Carry limit (2 consecutive recommended)
- Overload limit per Player per session
- Minimum Rating Confidence for overload
- Candidate-generation pool size
- Alternative count (3–5)
- Match Suitability threshold
- Mode-specific scoring weights
- Target probability ranges per mode
- Minimum productive Overload probability (15–20%)
- Repetition lookback window
- Session setting defaults in §22

---

## 42. Adaptive Mode — Future Extension

**Not required for initial implementation.**

Adaptive Mode may dynamically choose internal style: Recovery, Balanced, Challenge, Training, Overload based on pool state (winning streaks, developing Players waiting, post-hard-match group, four similar ratings).

Document only — implement when approved.

---

## 43. Match Start Eligibility

Revalidate immediately before start. Player may become ineligible after queue placement.

When queued match invalid: mark requiring review, notify Que Master, do not auto-start, offer regeneration or replacement, preserve audit history.

---

## 44. Cross-Document References

| File | Responsibility |
| ---- | -------------- |
| [`automatic_queueing.md`](./automatic_queueing.md) | **Canonical** Automatic Queueing (this file) |
| [`08_queue_session.md`](./08_queue_session.md) | Que Session lifecycle, Match Queue, Request a Match, session settings |
| [`18_canonical_rules.md`](./18_canonical_rules.md) | RULE-084–088 and related hard rules |
| [`00_ubiquitous_language.md`](../00_ubiquitous_language.md) | Glossary terms |
| [`06_skill_rating.md`](./06_skill_rating.md) | Skill Rating (distinct from matchmaking strength) |
| [`21_mmr_calibration.md`](./21_mmr_calibration.md) | MMR calibration (display only for AQ) |
| [`../../database/03_queue_sessions.md`](../../database/03_queue_sessions.md) | AQ session settings schema |
| [`../../database/04_matches.md`](../../database/04_matches.md) | Decision record schema |
| [`../../views/client_app/que_master/que_master_console.md`](../../views/client_app/que_master/que_master_console.md) | Que Master AQ panel |
| [`../../views/client_app/player/player_session_view.md`](../../views/client_app/player/player_session_view.md) | Player match display |
| [`../../views/client_app/que_master/que_master_add_match.md`](../../views/client_app/que_master/que_master_add_match.md) | Manual Queueing UI |

---

## Coverage checklist

- [x] All four modes (Fun / Relaxed, Normal / Balanced, Training Style, Overload Training)
- [x] Five Player dimensions (Effective Strength, Rating Confidence, Challenge Index, Queue Priority, Fatigue and Readiness)
- [x] Session standings and win-rate interpretation (expected vs actual)
- [x] Match difficulty, carry burden, variety, repetition
- [x] Predicted probability and Match Suitability Score
- [x] Candidate generation pipeline
- [x] Que Master controls and Player display
- [x] Realtime, concurrency, validation, edge cases
- [x] Data responsibilities, API responsibilities, testing, analytics
- [x] Deferred tuning clearly labeled `[configurable]`
- [x] Adaptive Mode marked future extension
