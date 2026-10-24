# 12 — Match History

## Overview

Every player has a persistent match history that accumulates across all clubs, sessions, and (future) tournaments they participate in. Match history is the foundation for statistics, skill rating, and the behavioral record of a player on the platform.

---

## 12.1 What Constitutes a Match Record

A match record is created when a match is **added to the queue** by the Que Master. It is updated through its lifecycle and finalized when the match is marked **Complete**.

---

## 12.2 Match Record Fields

| Field | Type | Description |
|-------|------|-------------|
| Match ID | UUID | Unique identifier |
| Club | Reference | Which club hosted the match |
| Session | Reference | Which queue session the match was part of |
| Tournament | Reference | Which tournament (nullable — session matches have no tournament) |
| Date | Timestamp | When the match was played (start time) |
| Duration | Integer (minutes) | Elapsed time from start to score submission |
| Format | Enum | Singles / Doubles |
| Match format | Enum | Best of 1 / Best of 3 |
| Score limit | Integer | e.g. 21 |
| Team A | Player references | 1 or 2 players |
| Team B | Player references | 1 or 2 players |
| Score | Object | `{ team_a: [set scores], team_b: [set scores] }` |
| Winner | Enum | Team A / Team B / Draw / Unscored |
| Score source | Enum | Umpire / Que Master / None |
| Umpire | Player reference | Nullable |
| Status | Enum | In Progress / Review Phase / Complete / Voided |
| Voided reason | Text | Nullable; filled if Que Master voids the match |

---

## 12.3 Match History on Player Profile

Each player's public profile shows their match history as a list.

### What Is Visible (Public)

| Element | Visibility |
|---------|-----------|
| Date | Public |
| Club name | Public |
| Opponent(s) name(s) | Public |
| Partner(s) name(s) | Public |
| Score | Public (if scored) |
| Result: Win / Loss / Draw / Unscored | Public |
| Match format (singles/doubles) | Public |

### What Is Not Publicly Visible

| Element | Who Sees It |
|---------|------------|
| Raw text reviews received for that match | Player only (with acknowledgment) |
| Individual rating submitted per rater | System only (aggregate shown publicly) |
| Payment status | Que Master / Club Owner only |

---

## 12.4 Match Statuses

| Status | Description |
|--------|-------------|
| In Progress | Match is actively being played |
| Review Phase | Match has ended; waiting for reviews / umpire score |
| Complete | All completion conditions met; stats updated |
| Voided | Que Master has voided the result; excluded from all rankings and stats |

---

## 12.5 Voided Matches

A Que Master can void a match result at any time after completion:

* The match record is retained (for audit purposes) but flagged as Voided
* Voided matches are excluded from:
  * Leaderboard rankings
  * Win/loss statistics
  * Skill rating calculations
  * EXP distributions (retroactively reversed if already granted)
* The reason for voiding is recorded and visible to the Club Owner

---

## 12.6 Data Retention Rules

* Match records are **never deleted**, even if:
  * The player leaves the club
  * The player deletes their account (future: account deletion)
  * The club is archived
* If a player leaves or is removed from a club, their historical match results are retained
* On public leaderboards and match history, a removed/left player's name displays as "[Former Member]"
* If a player deletes their account (future), their name becomes "[Deleted Player]" and all their records are anonymized but not removed

---

## 12.7 Match History Filters

On the player's profile and in the club admin view, match history can be filtered by:

| Filter | Options |
|--------|---------|
| Club | All / Specific club |
| Time range | All time / Last 30 days / Last 90 days / Custom |
| Result | All / Wins / Losses / Unscored |
| Format | All / Singles / Doubles |
| Opponent | Search by player name |

---

## 12.8 Advanced Stats Derived from Match History

The following stats in `05_player_profile.md` are computed from the match history:

* Most frequent partner (most appearances as teammate)
* Most frequent opponent (most appearances on opposing team)
* Best partner by win rate (partner with whom win% is highest)
* Toughest opponent (opponent with highest win% against this player)
* Peak skill rating (highest point recorded in the rolling average)
* Rating trend (direction of last 10 ratings)
