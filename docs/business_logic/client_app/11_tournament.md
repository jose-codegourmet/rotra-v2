# 11 — Tournament (Future)

## Status

**Planned for Phase 3.** The tournament module is not part of the MVP. This document captures the intended design so that the data model and architecture can accommodate it from the start.

---

## Overview

Tournaments are structured, bracket-based competitions hosted under a club. Unlike queue sessions (which are casual, rotation-based), tournaments are competitive events with defined brackets, scheduled matches, and prize recognition.

---

## 11.1 Tournament Types (Planned)

| Format | Description |
|--------|-------------|
| Single Elimination | Lose once and you're out; fastest to run |
| Double Elimination | Lose once → enter losers bracket; two losses to eliminate |
| Round Robin | Every team plays every other team; most matches for each player |
| Group Stage + Knockout | Pool play then top N advance to single elimination |

---

## 11.2 Skill Tiers

Tournaments can be restricted to a skill tier to ensure fair competition:

| Tier | Skill Rating Range | Playing Level |
|------|--------------------|---------------|
| Open | Any | Any |
| Beginner | 1.0 – 2.5 | Beginner |
| Intermediate | 2.0 – 3.5 | Intermediate |
| Advanced | 3.0 – 5.0 | Advanced |
| Elite | 4.0 – 5.0 | Advanced only |

* Tier eligibility is based on the player's **computed skill rating**, not self-declared level
* Players flagged for sandbagging cannot enter tiers below their system-computed tier

---

## 11.3 Tournament Administration

* Tournaments are created by Club Owners (not Que Masters in the standard session sense)
* A dedicated **Tournament Admin** role may be assigned per tournament (similar to Que Master for sessions)
* Tournament Admin can:
  * Set brackets
  * Schedule matches
  * Record scores
  * Advance brackets
  * Publish results

---

## 11.4 Tournament Registration

* Players register through the app (similar to session registration)
* Doubles tournaments require pair registration (players submit as a team)
* Registration can have a fee (tracked via the Cost System)
* Waitlist for oversubscribed tournaments (same FIFO logic as sessions)
* Cut-off date: registration closes at a Que Master-configured time before the tournament starts

---

## 11.5 Match Scheduling

* Matches are scheduled by the Tournament Admin (manual or auto-suggested based on bracket)
* Each match has a designated court, time slot, and optional umpire
* Players are notified when their next match is scheduled
* Smart Monitoring (score alerting) applies to tournament matches the same as session matches

---

## 11.6 Scoring & Results

* Umpires record scores via the standard scoreboard interface
* Bracket advances automatically when a match result is submitted
* Final results are locked and published to the club leaderboard and tournament-specific standings

---

## 11.7 EXP Multiplier

Tournament matches award EXP at a multiplier:

| Round | EXP Multiplier |
|-------|----------------|
| Group stage / early rounds | ×1.5 |
| Quarterfinal | ×2.0 |
| Semifinal | ×2.5 |
| Final | ×3.0 |
| Tournament winner | Additional flat bonus: +100 EXP |

---

## 11.8 Tournament Leaderboard

* Separate from the session and club leaderboard
* Shows bracket progression, wins, and scores for all participants
* Shareable as a public link (for spectators / social sharing)
* Published as a final snapshot when the tournament concludes

---

## 11.9 Data Model Considerations (For MVP Architecture)

To avoid a costly migration when tournaments ship, the MVP data model should account for:

* Matches having a `source_type` field: `session` or `tournament`
* A `tournament_id` field on match records (nullable in MVP)
* EXP transactions having a `multiplier` field (default 1.0 in MVP)
* Leaderboard entries having a `scope` field: `session` / `club` / `tournament` / `global`
