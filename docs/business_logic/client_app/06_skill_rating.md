# 06 — Skill Rating System

## Overview

The Skill Rating is a **computed numeric score (1–5)** that reflects a player's actual skill level based on match observations and peer assessments. It is separate from the player's self-declared Playing Level, though both are displayed on the profile.

**MMR** moves only on **Club Que Sessions** with **Session type = MMR** (`08_queue_session.md`, `14_gamification.md`). Skill dimensions still update from post-match reviews on **all** completed session types (Friendly Regular, Fun Games, and MMR) when raters submit scores.

Skill ratings are **not a single catch-all number**. They are built from six grouped **Skill Dimensions**, each rated independently after a match. The overall 1–5 rating is the weighted average of those dimensions. This gives raters meaningful, observable criteria to evaluate — and gives players a detailed breakdown of where they excel and where they can improve.

The rating is used by Que Masters to balance teams in the Add Match interface, and by the anti-sandbagging system to detect players misrepresenting their level.

---

## 6.0 Skill Dimension Framework

### How It Works

1. After each match, raters evaluate the observed players across **6 Skill Dimensions**
2. Each dimension is rated on a **1–5 scale**
3. Dimensions the rater did not observe (e.g. a player never smashed) can be **skipped** — unskipped dimensions only
4. Each dimension produces its own running average (weighted by source, same as the overall)
5. The **Overall Skill Rating** is the weighted average of all dimension scores

```
overall_rating = weighted_avg(attack, defense, net_touch, precision, athleticism, game_intelligence)
```

Each dimension has an equal weight by default (1/6). Weights are configurable by Admin.

### Why 6 Dimensions

The full list of specific skills (25 items) is too granular for post-match rating — raters would face fatigue and skip everything. Instead, the specific skills are **grouped into 6 observable dimensions** that a rater can meaningfully judge in a 15–20 minute match.

The specific sub-skills within each dimension serve two purposes:
1. **Rating guidance** — shown as a tooltip/hint to help raters know what they're evaluating
2. **Admin-managed constants** — stored in a constants file, editable via the Admin portal without a code deploy

---

## 6.1 Skill Dimensions

The 6 dimensions and their constituent sub-skills. Sub-skills are stored in `constants/skill_dimensions` (see 6.9).

---

### Dimension 1 — Attack

> *How well does the player generate offensive pressure and win points outright?*

| Sub-skill | What It Reflects |
|-----------|-----------------|
| Smash | Basic overhead power shot |
| Half Smash | Controlled half-power smash with deceptive angle |
| Jump Smash | Power and coordination at jump height |
| Cross Smash | Control to redirect a smash cross-court |
| Drive | Fast, flat shot requiring quick reaction |
| Cross Drive | Drive redirected cross-court; reaction + control |
| Backhand Smash | Power and coordination from the backhand side |

---

### Dimension 2 — Defense

> *How well does the player absorb offensive pressure and stay in the rally?*

| Sub-skill | What It Reflects |
|-----------|-----------------|
| Clear | Basic high defensive return to reset the rally |
| Backhand | Core backhand coordination and defensive positioning |
| Backhand Clear | Defensive backhand shot to reset from the rear |

---

### Dimension 3 — Net & Touch

> *How well does the player control the net and short game?*

| Sub-skill | What It Reflects |
|-----------|-----------------|
| Net Play | Wrist sensitivity and shuttle control at the net |
| Setting | Tight net lift with control and ball anticipation |
| Push | Controlled flat push past the net player |
| Drop | Controlled drop shot from mid/rear court |
| Backhand Drop | Coordination and control on a backhand drop |

---

### Dimension 4 — Precision & Control

> *How well does the player execute shots with accuracy, disguise, and placement?*

| Sub-skill | What It Reflects |
|-----------|-----------------|
| Slice | Wrist movement, control, and shot disguise |
| Backhand Slice | Wrist, coordination, and control on the backhand |
| Cross Drop | Control and precision on a cross-court drop |
| Placing | Intentional targeting of open or difficult zones |
| Deception | Ability to disguise shot direction or timing |

---

### Dimension 5 — Athleticism

> *How well does the player move on court and react to the shuttle?*

| Sub-skill | What It Reflects |
|-----------|-----------------|
| Footwork | Court coverage, recovery speed, and movement efficiency |
| Anticipation | Reading the opponent early and positioning ahead of the shot |

---

### Dimension 6 — Game Intelligence

> *How well does the player make smart decisions and contribute to team play?*

| Sub-skill | What It Reflects |
|-----------|-----------------|
| Critical Thinking | Adjusting strategy mid-rally or mid-game |
| Teamwork | Communication, court coverage sharing, and doubles coordination |
| Deception (tactical) | Using shot selection to create openings, not just disguise |
| Placing (tactical) | Using court geometry to consistently win points |

> Note: Deception and Placing appear in both Precision & Control (execution quality) and Game Intelligence (tactical intent). In the rating UI, they appear once under Precision & Control. Their tactical component is reflected in the Game Intelligence score through the rater's holistic judgment.

---

## 6.2 Rating Scale

Each dimension is rated on the same scale:

| Score | Label | What It Means in Practice |
|-------|-------|--------------------------|
| 1 | Poor | Skill is absent or consistently a liability |
| 2 | Below Average | Skill is inconsistent; breaks down under pressure |
| 3 | Average | Skill is functional and reliable in normal play |
| 4 | Above Average | Skill is a strength; used effectively and consistently |
| 5 | Strong | Skill is a clear weapon; noticeably superior |

* Ratings are submitted as whole numbers (1–5) per dimension
* A dimension left blank by a rater is excluded from that match's contribution to that dimension's average
* The player's **displayed overall rating** is a weighted rolling average rounded to one decimal place (e.g. 3.7)
* The rolling average uses the most recent **50 external match assessments** per dimension (older assessments phase out)

---

## 6.3 Rating Sources & Weights

Five sources can contribute ratings. Each source carries a different trust weight applied uniformly across all dimensions.

| Source | Weight | Type | Notes |
|--------|--------|------|-------|
| Que Master | High (×3) | Post-match | Observed the full match; highest authority |
| Umpire | High (×3) | Post-match | Watched end-to-end; highly reliable |
| Opponent | Medium (×2) | Post-match | Played against the rated player; biased but relevant |
| Partner | Medium (×1.5) | Post-match | Played alongside; context-aware but tends toward generosity |
| Self-assessment | Low (×1) | Profile setup | Baseline only; phased out as external data accumulates |

### Calculation Logic

For each dimension:

```
dimension_weighted_sum = sum of (dimension_rating × source_weight) for all received ratings
dimension_total_weight = sum of all source_weights for that dimension
dimension_score = dimension_weighted_sum / dimension_total_weight
```

For the overall rating:

```
overall_rating = (attack + defense + net_touch + precision + athleticism + game_intelligence) / 6
```

Dimension weights in the overall calculation are equal by default and configurable via Admin (see 6.9).

* Ratings from the same source type within a single match are averaged per dimension before being combined
* Example: 2 opponents each rate a player's Attack dimension → their scores are averaged into one Opponent-Attack rating for that match

### Self-Assessment Phaseout

Self-assessment is set per dimension at profile setup. Its weight decreases as external ratings accumulate:

| External Match Assessments Received (per dimension) | Self-Assessment Weight |
|-----------------------------------------------------|----------------------|
| 0–4 | Full (×1) |
| 5–9 | Half (×0.5) |
| 10–19 | Quarter (×0.25) |
| 20+ | Excluded entirely |

---

## 6.4 Rating Submission Window

| Event | Timing |
|-------|--------|
| Window opens | Immediately after the match is marked complete |
| Window closes | 24 hours after match completion |
| Late submissions | Discarded — not applied to any dimension average |
| Reminder notification | Sent 2 hours before the window closes |

All raters operate within the same 24-hour window. The Que Master can rate immediately at match finalization.

---

## 6.5 What Gets Rated

After each match, raters evaluate each player across the 6 skill dimensions.

| Rater | Who They Rate | Dimension Rating Required? |
|-------|--------------|--------------------------|
| Player | All other players in the match | No — each dimension is optional; skip unobserved |
| Que Master | All players in the match | No — skip dimensions not observed |
| Umpire | All players in the match | No — score submission is mandatory; ratings optional |

### Rating UX Flow

1. Rater opens the post-match review screen
2. For each player being rated, the rater sees **6 dimension cards**
3. Each card shows: dimension name, a 1–5 selector, and a collapsed list of sub-skills as context hints
4. Rater scores only the dimensions they observed; untouched dimensions are treated as "not rated" (not as 0)
5. An optional text note field is shown below the dimension cards (anonymous for players; named for Que Master)
6. Rater submits — partial submissions are accepted (some dimensions scored, others skipped)

A player **cannot rate themselves** through the post-match flow. Self-assessment per dimension is set only at profile setup.

---

## 6.6 Rating Visibility

| What | Visible To |
|------|-----------|
| Overall skill rating (1-5 average) | Everyone — public profile |
| Per-dimension scores (radar/spider chart) | Everyone — public profile |
| Individual rating submitted by a specific rater | System only — aggregate shown publicly |
| Rating trend per dimension (ascending/stable/descending) | Player only, on their own profile |
| Dimensions with fewer than 5 ratings | Hidden from public; shown as "Not enough data" |
| Sandbagging flag | Que Masters and Club Owners only |

### Profile Display

The player profile shows:
* **Overall Rating badge** — the single weighted 1–5 number (e.g. 3.7)
* **Skill Radar Chart** — a hexagonal spider chart with one axis per dimension
* **Dimension breakdown** — collapsible table with each dimension's score and match count

---

## 6.7 Anti-Sandbagging System

**Sandbagging** = deliberately keeping a low declared level to gain unfair advantages (easier matches, lower bracket placement in future tournaments).

### Detection Signals

The system flags a player when two or more of the following are true:

| Signal | Threshold |
|--------|-----------|
| Win rate vs. higher-rated opponents | Consistently wins > 60% against players with an overall rating 1+ above them |
| External vs. self-assessment divergence | External dimension averages are > 1.0 higher than self-declared scores |
| Partner generosity discrepancy | All partners rate ≥ 4 across most dimensions; player self-assesses ≤ 2 |
| Yo-yo pattern | Overall rating drops > 0.5 within 2 weeks of being elevated, repeated twice |

### System Response

When a player is flagged:

1. Their **displayed playing level** is overridden by the system-computed level equivalent:
   * Computed overall 1.0–2.0 → displayed as Beginner
   * Computed overall 2.1–3.5 → displayed as Intermediate
   * Computed overall 3.6–5.0 → displayed as Advanced
2. A **sandbagging flag icon** appears on their profile, visible to Que Masters and Club Owners
3. Club Owner receives a notification and can dismiss or escalate to Admin (future)
4. The player is notified that their displayed level has been adjusted

### Clearing a Flag

* Flag auto-clears if detection signals are absent for 30+ consecutive days
* Club Owner can manually clear the flag with a written justification (logged for audit)

---

## 6.8 Rating Integrity Rules

* A player cannot submit a rating for a match they did not participate in
* A Que Master cannot submit ratings for a session they did not host
* Skipping all dimensions is treated as not submitting — no partial submission with all fields empty is accepted
* Ratings submitted by players who are later suspended or banned are retroactively removed from all affected dimension averages
* The system detects coordinated rating inflation (same cluster consistently rating each other at maximum across all dimensions) — flagged for Admin review (Phase 2+)

---

## 6.9 Constants & Admin Configuration

### Storage

Skill dimensions and their sub-skills are stored in a **constants file** (not hardcoded in application logic):

```
constants/
  skill_dimensions.json
```

### Structure of `skill_dimensions.json`

```json
[
  {
    "id": "attack",
    "label": "Attack",
    "description": "How well does the player generate offensive pressure and win points outright?",
    "weight": 1.0,
    "sub_skills": [
      { "id": "smash",          "label": "Smash",          "hint": "Basic overhead power shot" },
      { "id": "half_smash",     "label": "Half Smash",     "hint": "Controlled half-power smash with deceptive angle" },
      { "id": "jump_smash",     "label": "Jump Smash",     "hint": "Power and coordination at jump height" },
      { "id": "cross_smash",    "label": "Cross Smash",    "hint": "Control to redirect a smash cross-court" },
      { "id": "drive",          "label": "Drive",          "hint": "Fast, flat shot requiring quick reaction" },
      { "id": "cross_drive",    "label": "Cross Drive",    "hint": "Drive redirected cross-court; reaction + control" },
      { "id": "backhand_smash", "label": "Backhand Smash", "hint": "Power and coordination from the backhand side" }
    ]
  },
  {
    "id": "defense",
    "label": "Defense",
    "description": "How well does the player absorb offensive pressure and stay in the rally?",
    "weight": 1.0,
    "sub_skills": [
      { "id": "clear",          "label": "Clear",          "hint": "Basic high defensive return to reset the rally" },
      { "id": "backhand",       "label": "Backhand",       "hint": "Core backhand coordination and defensive positioning" },
      { "id": "backhand_clear", "label": "Backhand Clear", "hint": "Defensive backhand shot to reset from the rear" }
    ]
  },
  {
    "id": "net_touch",
    "label": "Net & Touch",
    "description": "How well does the player control the net and short game?",
    "weight": 1.0,
    "sub_skills": [
      { "id": "net_play",      "label": "Net Play",      "hint": "Wrist sensitivity and shuttle control at the net" },
      { "id": "setting",       "label": "Setting",       "hint": "Tight net lift with control and ball anticipation" },
      { "id": "push",          "label": "Push",          "hint": "Controlled flat push past the net player" },
      { "id": "drop",          "label": "Drop",          "hint": "Controlled drop shot from mid/rear court" },
      { "id": "backhand_drop", "label": "Backhand Drop", "hint": "Coordination and control on a backhand drop" }
    ]
  },
  {
    "id": "precision",
    "label": "Precision & Control",
    "description": "How well does the player execute shots with accuracy, disguise, and placement?",
    "weight": 1.0,
    "sub_skills": [
      { "id": "slice",          "label": "Slice",          "hint": "Wrist movement, control, and shot disguise" },
      { "id": "backhand_slice", "label": "Backhand Slice", "hint": "Wrist, coordination, and control on the backhand" },
      { "id": "cross_drop",     "label": "Cross Drop",     "hint": "Control and precision on a cross-court drop" },
      { "id": "placing",        "label": "Placing",        "hint": "Intentional targeting of open or difficult zones" },
      { "id": "deception",      "label": "Deception",      "hint": "Ability to disguise shot direction or timing" }
    ]
  },
  {
    "id": "athleticism",
    "label": "Athleticism",
    "description": "How well does the player move on court and react to the shuttle?",
    "weight": 1.0,
    "sub_skills": [
      { "id": "footwork",      "label": "Footwork",      "hint": "Court coverage, recovery speed, and movement efficiency" },
      { "id": "anticipation",  "label": "Anticipation",  "hint": "Reading the opponent early and positioning ahead of the shot" }
    ]
  },
  {
    "id": "game_intelligence",
    "label": "Game Intelligence",
    "description": "How well does the player make smart decisions and contribute to team play?",
    "weight": 1.0,
    "sub_skills": [
      { "id": "critical_thinking", "label": "Critical Thinking", "hint": "Adjusting strategy mid-rally or mid-game" },
      { "id": "teamwork",          "label": "Teamwork",          "hint": "Communication, court coverage sharing, and doubles coordination" },
      { "id": "deception_tactical","label": "Deception",         "hint": "Using shot selection to create openings, not just disguise" },
      { "id": "placing_tactical",  "label": "Placing",           "hint": "Using court geometry to consistently win points" }
    ]
  }
]
```

### What Admins Can Configure

Via the Admin portal, without a code deploy:

| Setting | Description |
|---------|-------------|
| Add a new dimension | New dimension appears on all future rating forms |
| Edit dimension label / description | Updates the UI label and tooltip |
| Disable a dimension | Hides it from rating forms; excluded from overall calculation |
| Change dimension weight | Adjusts how much it contributes to the overall rating |
| Add a sub-skill to a dimension | Adds a new hint item to the dimension's guidance card |
| Edit a sub-skill label or hint | Updates the tooltip shown to raters |
| Disable a sub-skill | Removes it from the guidance card (historical data is retained) |

> **Important**: Admin changes to dimensions affect **future ratings only**. Historical ratings are stored against their dimension ID and are never retroactively recomputed.
