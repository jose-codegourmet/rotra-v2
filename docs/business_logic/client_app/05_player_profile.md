# 05 — Player Profile System

## Overview

Every player has a persistent profile that travels with them across all clubs and sessions. The profile serves as their **badminton identity** — visible to other players, Que Masters, and Club Owners. It combines self-declared information, system-computed statistics, and optional gear showcases.

---

## 5.1 Basic Profile

Seeded from Facebook on first login. Phone number and profile onboarding fields are collected via the post-OAuth onboarding screens (`/onboarding/phone` and `/onboarding/profile`). All fields except Joined Date are editable.

| Field | Source | Editable | Visibility | Notes |
|-------|--------|----------|------------|-------|
| Display name | `profiles.name` (seeded from Facebook at first login; confirmed/edited at onboarding) | Yes | Public | Shown in all queue and leaderboard views; runtime reads DB, not OAuth metadata |
| Profile photo | `profiles.avatar_url` (seeded from Facebook at first login) | Yes | Public | Can upload a custom photo; runtime reads DB, not OAuth metadata |
| Playing level | Self-set | Yes | Public | Beginner / Intermediate / Advanced |
| Phone number | Collected at `/onboarding/phone` | Yes | Private | Required; not shown on public profile |
| Age | Collected at `/onboarding/profile` | Yes | Private | Integer 13–99; never shown publicly |
| Playing since | Collected at `/onboarding/profile` | Yes | Public | Year started or "Less than 1 year"; shown as "Playing since YYYY" |
| Tournament wins last year | Collected at `/onboarding/profile` | Yes | Public | Self-reported snapshot; shown as a badge (omitted if `none`) |
| Joined date | System | No | Public | Date of first login |

### Playing Level

Playing level is the player's **self-declared skill tier**. It is distinct from the computed Skill Rating (see `06_skill_rating.md`), which is derived from match data and peer assessments.

| Level | Intended For |
|-------|-------------|
| Beginner | New to the sport or just learning fundamentals |
| Intermediate | Can rally consistently; understands basic strategy |
| Advanced | Competitive; strong technical and tactical ability |

The system may **override the displayed level** if anti-sandbagging detection flags a significant discrepancy between self-declared level and computed rating. In that case, the system-computed level is shown publicly, and the self-declared level is retained internally.

---

## 5.2 Play Style

Informational preferences that help Que Masters and teammates understand a player's tendencies. These do not affect queue priority or any algorithm.

| Preference | Options | Source | Notes |
|-----------|---------|--------|-------|
| Format | Singles / Doubles / Both | Self-set (Profile Settings) | Multiple selections allowed |
| Court position (doubles) | Front / Back / All-Around | Collected at `/onboarding/profile` Step 4 | Single-select; "All-Around" is the UI label for internal value `all_around` (equivalent to "Both" in prior logic) |
| Play mode | Competitive / Social / Both | Self-set (Profile Settings) | Multiple selections allowed |

Court position is collected during the onboarding wizard and pre-populates this section. Players can update all play style preferences at any time from Profile Settings or the Play Style section of the own-profile screen.

---

## 5.3 Gear Showcase

Players can build a public gear list. Each gear category supports **multiple items**, and each item behaves like a mini post with a title, description, and optional purchase links.

Categories: **Rackets**, **Shoes**, **Bags**

Items are visible on the public profile. They are purely social and informational — no gameplay implications.

---

### 5.3.1 Rackets

Each racket entry represents one racket setup (racket + string + grip).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Brand | Text | Yes | e.g. Yonex, Victor, Li-Ning |
| Model | Text | Yes | e.g. Astrox 99 |
| Balance type | Select | Yes | Head Heavy / Head Light / Even Balanced |
| String brand | Text | No | e.g. Yonex |
| String model | Text | No | e.g. BG80 |
| String tension | Number | No | In lbs or kg (player specifies unit) |
| Grip | Text | No | e.g. "Yonex AC102 Towel Grip" |
| Where to buy | URL list | No | One or more purchase links |
| Title | Text | Yes | Short label shown on profile card (e.g. "Main Racket") |
| Description | Text | No | Free-text caption |

---

### 5.3.2 Shoes

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Brand | Text | Yes | e.g. Yonex, Mizuno, Asics |
| Model | Text | Yes | |
| Size | Number | Yes | Player's size (player specifies country sizing) |
| Fit type | Select | Yes | Wide / Narrow / Standard (Standard: future) |
| Where to buy | URL list | No | One or more purchase links |
| Title | Text | Yes | Short label for the profile card |
| Description | Text | No | Free-text caption |

---

### 5.3.3 Bags

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Brand | Text | Yes | |
| Model | Text | No | |
| Size / Capacity | Text | No | e.g. "6-racket", "large", "backpack" |
| Where to buy | URL list | No | One or more purchase links |
| Title | Text | Yes | Short label for the profile card |
| Description | Text | No | Free-text caption |

---

## 5.4 Player Statistics

Aggregated across all clubs and sessions the player has participated in. Displayed on the public profile.

| Stat | Description | Computed From |
|------|-------------|---------------|
| Games played | Total completed matches | All scored matches across all clubs |
| Wins | Total match wins | Scored matches where player's team won |
| Losses | Total match losses | Scored matches where player's team lost |
| Win rate | Wins ÷ Games played (%) | Requires at least 1 scored match |
| Sessions attended | Count of distinct queue sessions | All sessions where player was Accepted and marked "I Am In" |
| Clubs joined | Count of clubs ever joined | Active + previously left clubs |
| Tournaments played | Count of tournament entries | Future — tournament module |
| Average skill rating | Weighted rolling average of all received ratings | See `06_skill_rating.md` |
| EXP points | Total accumulated experience points | See `14_gamification.md` |
| Ranking tier | EXP-based or position-based tier badge | Cadet 1 → Titan 5 (EXP-based); Apex N → Apex Predator (position-based) |

### Display Rules

* Stats are shown in a summary panel at the top of the player's profile
* Win rate and skill rating only show once the player has at least **5 scored matches**
* Before 5 matches: these fields show "Not enough data"

---

## 5.5 Advanced Statistics

Unlocked once a player has completed at least **20 matches**. Displayed in an expandable section on the profile.

| Stat | Description |
|------|-------------|
| Most frequent partner | Player most often paired with in doubles |
| Most frequent opponent | Player most often faced |
| Best partner (win rate) | Doubles partner with whom win rate is highest |
| Toughest opponent | Opponent with the highest win rate against this player |
| Peak skill rating | Highest skill rating point ever recorded |
| Rating trend | Direction over last 10 matches: Ascending / Stable / Descending |
| Favourite club | Club where most matches were played |
| Best session | Session where win rate was highest |

### Rating Trend Definition

| Trend | Condition |
|-------|-----------|
| Ascending | Average of last 5 ratings is ≥ 0.3 higher than the 5 before that |
| Descending | Average of last 5 ratings is ≥ 0.3 lower than the 5 before that |
| Stable | Change is less than 0.3 in either direction |

---

## 5.6 Profile Visibility

| Section | Visible To |
|---------|-----------|
| Name, photo, playing level, play style | All users (public) |
| Playing since | All users (public) |
| Court position | All users (public) — shown in Play Style section |
| Tournament wins last year | All users (public) — shown as a badge; omitted if `none` |
| Gear showcase | All users (public) |
| Statistics (basic) | All users (public) after 5 matches |
| Advanced statistics | All users (public) after 20 matches |
| Match history (results) | All users (public) |
| Reviews received (aggregated) | Player only (with acknowledgment warning) |
| Reviews received (raw per-match) | Not shown to anyone — only aggregate is displayed |
| Age | Player only — never shown publicly |
| Phone number | Player only (editable in settings); Que Master and Club Owner can see it for operational contact |
| Payment records | Que Master and Club Owner only |

### Legacy / null field display

Players who registered before the onboarding wizard was introduced have `age`, `playing_since`, `court_position`, and `tournament_wins_last_year` defaulting to `null`. Their public profile shows "Not set" for these fields alongside a contextual "Complete your profile" prompt that links to Profile Settings.

---

## 5.7 Player Comparison

Any authenticated player can compare two players side by side using the comparison feature. The comparison surfaces only data that is already publicly visible on each player's individual profile, and applies each section's visibility gate independently per player.

See [`19_player_comparison.md`](./19_player_comparison.md) for the full specification, including head-to-head record, skill radar overlay, advanced stats comparison, and sharing rules.
