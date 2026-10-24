# 10 — Leaderboard

## Overview

Leaderboards provide ranked standings of players based on match outcomes. They exist at three scopes: per session, per club, and globally (future). Leaderboards are real-time during active sessions and published as snapshots at session close.

---

## 10.1 Leaderboard Scopes

| Scope | Resets | Description | Status |
|-------|--------|-------------|--------|
| Session | Per session | Rankings within one queue session | MVP |
| Club | Never (cumulative) | Cumulative rankings across all sessions in a club | MVP |
| Global | Never (cumulative) | Platform-wide rankings across all clubs | Future (Phase 3) |

---

## 10.2 Ranking Criteria

All leaderboards use the same multi-level sort:

| Priority | Criterion | Description |
|----------|-----------|-------------|
| 1st | Wins | Total matches won (highest first) |
| 2nd | Win rate | Wins ÷ Games played (%) — used when wins are tied |
| 3rd | Games played | More games = more data; tiebreaker (highest first) |

A player with 5 wins from 5 games ranks above a player with 5 wins from 8 games (higher win rate).

Only **scored matches** count — matches without a submitted score (Unscored) are excluded from all ranking calculations.

---

## 10.3 Session Leaderboard

* Shows rankings for the current or completed session
* Updates in real-time as each match is completed and scored
* Applies to **all** session types: **player-organized**, **club Fun Games**, and **club MMR** — wins and losses count toward **session standings** whenever the match is scored and not voided
* All accepted players appear (even those with 0 games played — shown at the bottom)
* Filtered to the current session only — cross-session history is on the Club leaderboard

### Session Leaderboard Columns

| Column | Description |
|--------|-------------|
| Rank | Current position (tied ranks share the same number) |
| Player | Name + profile photo |
| Wins | Wins in this session |
| Losses | Losses in this session |
| Win rate | % (shown after ≥ 2 games) |
| Games played | Total matches in this session |

---

## 10.4 Club Leaderboard

* Cumulative across all completed sessions under the club
* Only completed and scored matches count
* **Player-organized**, **Fun Games**, and **MMR** club schedules all contribute to club win/loss / games-played columns — all are “recorded” for standings and history (`08_queue_session.md`)
* A future **MMR-only** (or “competitive-only”) filter for club stats is optional and not required for MVP
* Updates every time a session is finalized

### Club Leaderboard Columns

| Column | Description |
|--------|-------------|
| Rank | Current position |
| Player | Name + photo + tier badge |
| Wins | All-time wins in this club |
| Losses | All-time losses in this club |
| Win rate | % (min 5 games to show) |
| Games played | Total scored matches in this club |
| Sessions | Number of sessions attended |
| Skill rating | Current computed rating (1–5) |

### Filters (Club Leaderboard)

* Time range: All Time / Last 30 Days / Last 90 Days
* Session: filter by specific session (shows that session's contribution)
* Format: All / Singles / Doubles (future, requires match format tagging)

---

## 10.5 Data Sources

| Source | Authority | When Used |
|--------|-----------|-----------|
| Umpire-submitted score | Official; highest authority | When umpire is assigned and submits score |
| Que Master-submitted score | Manual entry | When no umpire is assigned |
| No score submitted | Match marked Unscored | Excluded from all rankings |

If both an umpire and the Que Master submit scores and they conflict, the **umpire score takes precedence**. The Que Master can override via a score dispute flow (see `08_queue_session.md` §8.9).

---

## 10.6 Leaderboard Display

### Real-Time (Active Session)

* Auto-refreshes as matches complete
* Players see their own rank highlighted
* Shows an estimated rank change indicator if the current match's result would affect standing

### Post-Session Snapshot

* Published when the session is marked Completed
* Frozen snapshot that does not change after publication
* Shareable as a link or image export

### Sharing Format

* **Link**: Live leaderboard URL (for club leaderboard) or snapshot URL (for session)
* **Image**: Auto-generated card with:
  * Club name and session date
  * Top 3 players (name, photo, wins, win rate)
  * "View full standings" prompt with QR/link
  * App branding

---

## 10.7 Global Leaderboard (Future — Phase 3)

* Platform-wide rankings aggregated across all clubs
* Requires a minimum match count to appear (e.g. 20 scored matches across all clubs)
* Can be filtered by region, playing level, or time range
* Featured on a public Explore page (accessible without login)
* Managed and curated by Admin (highlight featured players, tournaments, etc.)

---

## 10.8 Leaderboard Rules

* A player must be an accepted participant in a session to appear on the session leaderboard
* Matches voided by the Que Master are excluded from all ranking calculations
* Suspended players' match results during suspension period may be excluded at Club Owner discretion (future: Admin policy)
* All ranking data is append-only — historical records are never deleted when a player leaves a club (their results remain, their name becomes "[Former Member]" on public views)
