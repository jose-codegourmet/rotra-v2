# 14 — Gamification

## Overview

Gamification layers engagement and motivation on top of the core session system. It rewards participation, good behavior, and improvement. The system is designed to be purely cosmetic at MVP — **no pay-to-win, no purchases, no unfair advantages** based on EXP or tier.

---

## 14.0 Progression eligibility & MMR

### Session types (see `08_queue_session.md`)

| Session kind | EXP from matches / session attendance | MMR changes | Ranked progression |
|--------------|--------------------------------------|-------------|-------------------|
| **Player-organized** | No | No | No |
| **Club queue — Fun Games** | No | No | No |
| **Club queue — MMR (competitive)** | Yes (per rules below) | Yes | Yes |

**MMR** (matchmaking / competitive ladder rating) is separate from **Skill Rating** (`06_skill_rating.md`). Skill dimensions still update from post-match reviews in **all** session types when matches complete; **MMR** and **match-based EXP** apply **only** in **club queue** sessions whose **Schedule type** is **MMR (competitive)**.

### MMR behavior (qualitative)

* MMR is updated only after **completed, scored** matches in **MMR** club schedules (never for Fun Games or player-organized).
* Exact formulas, K-factors, and pairing rules are **Admin-configurable** (see Admin platform config).
* On **MMR** schedules, **mixed-rank teams** use **asymmetric** EXP and MMR deltas (see §14.3).
* **Calibration**: A player's first N competitive matches (default 10) apply an **amplified MMR multiplier** so ratings converge faster toward the player's true level. The calibration multiplier stacks multiplicatively with the asymmetric multiplier. See `21_mmr_calibration.md` for full specification.

---

## 14.1 EXP (Experience Points)

EXP is the primary gamification currency. It contributes to the player's **ranking tier** (see 14.2).

**Match- and session-attendance EXP** (everything in the table below except **Completing profile**) is awarded **only** when the activity occurs in a **club queue** session with **Schedule type = MMR (competitive)**. No match-related EXP is granted for **player-organized** or **Fun Games** sessions.

### EXP Earning Table

| Action | EXP Earned | Notes |
|--------|-----------|-------|
| Playing a match | +10 EXP (baseline; may be scaled — see §14.3) | MMR club schedule only; match completed and scored |
| Winning a match | +15 EXP (baseline; may be scaled — see §14.3) | MMR club schedule only; scored wins |
| Submitting a review after a match | +5 EXP | MMR club schedule only; per review submitted (up to 3 per match in doubles) |
| Being rated 4 or 5 by an opponent | +5 EXP bonus | MMR club schedule only; per opponent who rates you 4 or 5 |
| Acting as umpire for a match | +8 EXP | MMR club schedule only; when umpire submits final score |
| Attending a session (marked "I Am In") | +5 EXP | MMR club schedule only; once per session |
| Completing profile (all sections filled) | +20 EXP | One-time; not tied to session type |
| First match played (ever) | +25 EXP | One-time; triggers only when the first completed match is in an **MMR** club schedule |
| Winning first match | +25 EXP | One-time; triggers only on first win in an **MMR** club schedule |

### EXP Rules

* EXP is global — it accumulates across all clubs and sessions
* **Match-linked EXP** is only awarded for completed, scored matches in **MMR** club schedules (and related bonuses in that context). **Profile** one-time EXP ignores session type.
* On **MMR** schedules, **EXP can decrease** on match loss (see §14.3); amounts are Admin-configurable.
* If a match is voided by the session host, all EXP **and MMR changes** attributed to that match are retroactively reversed
* For sessions where match EXP does not apply, **no EXP gain or loss** occurs for those matches — aside from void/account penalties

---

## 14.2 Ranking Tiers

Tiers are cosmetic badges shown on the player's profile and in the queue player pool. Tiers from **Cadet** through **Titan** are EXP-based. The **Apex** and **Apex Predator** tiers are position-based — awarded to the highest-ranked players on the platform leaderboard, not unlocked through EXP alone.

### EXP-Based Tiers (Cadet → Titan)

| Tier | Sub-rank | Min EXP | Badge Color | Notes |
|------|----------|---------|------------|-------|
| Cadet | 1 | 0 | Grey | Default — new players |
| Cadet | 2 | 150 | Grey+ | |
| Warrior | 1 | 350 | Green | |
| Warrior | 2 | 600 | Green+ | |
| Warrior | 3 | 900 | Green++ | |
| Elite | 1 | 1,300 | Blue | |
| Elite | 2 | 1,800 | Blue+ | |
| Elite | 3 | 2,400 | Blue++ | |
| Elite | 4 | 3,200 | Blue+++ | |
| Master | 1 | 4,200 | Purple | |
| Master | 2 | 5,500 | Purple+ | |
| Master | 3 | 7,000 | Purple++ | |
| Master | 4 | 9,000 | Purple+++ | |
| Titan | 1 | 11,500 | Red | |
| Titan | 2 | 14,500 | Red+ | |
| Titan | 3 | 18,000 | Red++ | |
| Titan | 4 | 22,000 | Red+++ | |
| Titan | 5 | 27,000 | Red++++ | Highest EXP-based rank |

### Position-Based Tiers (Apex)

Once a player meets the Titan 5 EXP threshold, their Apex tier position is determined by their **platform rank** (global leaderboard standing).

| Tier | Badge Color | How It's Assigned |
|------|------------|-------------------|
| Apex N | Gold | N = the player's current rank position among all Apex-tier players (e.g. Apex 3 = 3rd highest-ranked) |
| Apex Predator | Animated Gold | Exclusively held by the #1 ranked player on the platform |

* Only one player can hold **Apex Predator** at any time — the current #1 on the global platform leaderboard
* Apex positions shift as the global leaderboard changes (e.g. a player can move from Apex 4 to Apex 2)
* Dropping below Titan 5 EXP does not remove the Apex badge until the next leaderboard snapshot

### General Tier Rules

* EXP-based tier thresholds are configurable by Admin
* Tiers are displayed on:
  * Player profile (prominently, next to name)
  * Queue player pool (small badge next to player card)
  * Leaderboard entries (small badge)
  * Shared profile cards
* EXP-based tiers never decrease — even if EXP is reversed from a voided match, the tier level is preserved (see RULE-042)

---

## 14.3 Asymmetric EXP / MMR (mixed ranks)

Applies **only** to **club queue — MMR (competitive)** matches when teammates (or the pairing context) span a large skill gap — e.g. **beginner / low MMR** with **high MMR** partner. Exact thresholds and multipliers are **Admin-configurable**.

### Lower-rated / beginner (relative to partner)

* **Win** (especially when “carried” by a much higher-rated teammate): **small** EXP and MMR gain — discourages farming progression by pairing only with stronger players.
* **Loss**: **larger** EXP loss and MMR loss than a balanced match — losing despite a strong partner is penalized more heavily.

### Higher-rated player

* **Win** with a much lower-rated partner: **larger** EXP and MMR gain — rewarded for securing a result the pairing was expected to win.
* **Loss** with that partner: **smaller** EXP loss and MMR loss than losing in an evenly matched game — the upset is attributed partly to the difficult handicap context.

Doubles team MMR/EXP attribution (split vs pooled) is an implementation detail; the **economic intent** above is fixed in product.

---

## 14.4 Badges (Future — Phase 3)

One-time achievement badges earned for specific milestones. Displayed as a collection on the player's profile.

### Planned Badges

| Badge | Trigger |
|-------|---------|
| First Rally | First match played |
| First Blood | First match won |
| Decade Club | 10 matches played |
| Half Century | 50 matches played |
| Century | 100 matches played |
| Unbeatable | Won all matches in a session (min 3 matches) |
| Top of the Court | Ranked 1st on a session leaderboard |
| Most Improved | Skill rating increased by > 1.0 in any 30-day period |
| Gear Head | Added 3 or more gear items to profile |
| Club Loyalist | Attended 10+ sessions in the same club |
| Umpire Pro | Umpired 20 matches across all sessions |
| Social Player | Received an average review rating of 4.5+ over 10 matches |

### Badge Display

* Badges appear as a scrollable row on the player profile
* Unearned badges are shown as locked/greyed out with the unlock condition visible
* Date earned is shown on hover/tap

---

## 14.5 EXP & Tier on the Queue Pool

In the Add Match interface, the Que Master sees each player's:

* Tier badge (colour indicator)
* EXP level (shown as a number or compact label)

This helps the Que Master understand relative engagement levels when building balanced teams, though it is informational only — tier and EXP have no functional impact on queue priority.

---

## 14.6 Gamification Principles

| Principle | Implementation |
|-----------|---------------|
| Participation over winning | On **MMR** schedules, EXP reflects play and outcomes; attending still bonuses when eligible |
| Sportsmanship rewarded | Bonus EXP for receiving high ratings from opponents (**MMR** sessions only) |
| Competitive fairness | Mixed-rank outcomes use asymmetric deltas (§14.3); no progression from informal or Fun Games |
| No shortcuts | Match EXP/MMR require **MMR** club schedules; no purchases |
| No pay-to-win | EXP, tiers, and badges have zero queue priority impact |
| Retroactive integrity | Voided matches reverse EXP and MMR attributed to that match |
| Transparent | Players can see how each EXP change was earned in the transaction log |

---

## 14.7 EXP Transaction Log

Each player can view their full EXP history:

| Field | Description |
|-------|-------------|
| Date | When EXP was awarded or reversed |
| Action | What triggered it (e.g. "Match played", "Review submitted") |
| EXP change | +10, -10, etc. |
| Match / Session reference | Which match or session it was for |
| Running total | Cumulative EXP at that point |

This log is visible only to the player themselves.
