# 🏸 Badminton Queueing & Leaderboard App

**Product Design Overview**

---

## 1. 🎯 Product Vision

A centralized badminton platform that combines:

* Queue-based match management
* Player statistics & skill tracking
* Gamified leaderboards
* Club-based organization

The goal is to:

> Standardize casual badminton queueing while introducing competitive integrity, transparency, and player identity.

The app serves three audiences simultaneously:

* **Players** — know when they play, track their progress, build their identity
* **Que Masters / Club Owners** — run sessions efficiently with minimal manual overhead
* **Clubs** — maintain a community with fair rotation, cost transparency, and records

---

## 2. 👥 User Roles

All users begin as **Players**. Elevated roles are granted additively — a Club Owner is still a Player in other clubs.

---

### 2.1 Player (Default)

* Registers via Facebook (1 account per user enforced at login level)
* Can:
  * Join and leave clubs
  * Create **player-organized** queue sessions under clubs they belong to
  * Register for queue sessions
  * Participate in matches
  * Submit reviews and ratings after matches
  * View own and others' stats and profiles
  * Share matches, profiles, and leaderboards

* Cannot:
  * Create **club queue** sessions with **Schedule type** (MMR vs Fun Games) — Que Master or Club Owner only
  * Modify the queue on sessions they do not host
  * Rate players mid-session (only post-match)

---

### 2.2 Club Owner / Host

* Must be **requested and approved per club** — each new `clubs` row comes from an admin-approved **`club_applications`** record (see `database/12_club_governance.md` and Admin App approvals).

* Inherits all Player capabilities within their own club
* Additionally can:
  * Apply for additional clubs (repeat application flow); **archive** clubs they own (no hard delete)
  * Create **club queue** sessions under their clubs (set **Schedule type**: MMR vs Fun Games)
  * Configure membership settings (auto-approve, invite links)
  * Invite players directly or via link/QR
  * Approve or reject join requests
  * Remove members from the club
  * Assign multiple club members as Que Masters simultaneously (no cap)
  * Revoke Que Master roles at any time
  * Oversee all sessions under their club
  * View payment and attendance summaries
  * Access the Club Statistics view (membership analytics + financial summaries)
  * Manage the club Blacklist

* Limitations:
  * Cannot assign themselves as a Que Master via the system (they may run sessions as owner but should create a separate Que Master assignment for another member if needed)
  * A Club Owner of Club A has no elevated privileges in Club B unless separately granted

---

### 2.3 Que Master

* **Not a global role** — scoped strictly to the club they are assigned in
* Assigned by the Club Owner of that club
* Only active club members are eligible for assignment
* A player can be Que Master in multiple clubs simultaneously

* Can (within assigned club's sessions):
  * Create and host **club queue** sessions (set **Schedule type**: MMR competitive vs Fun Games)
  * Manage the match queue (add, reorder, delete matches)
  * Drag-reorder upcoming matches via the Queue View
  * Set and update player statuses
  * Assign umpires to matches
  * Track payments and mark attendance
  * Finalize matches (bypassing review wait)
  * Rate players after matches
  * Override attendance status ("I am prepared" confirmation)
  * Trigger early exit processing

* Cannot:
  * Modify club membership settings
  * Approve or reject join requests
  * Assign other Que Masters

---

### 2.4 Admin (Future)

* Platform-level role, not club-scoped
* Will handle:
  * Approving or rejecting **club applications** and **demotion requests**; triaging **complaints** and **`moderation_flags`**
  * Platform-wide moderation (flagged reviews, bans)
  * Managing global rankings and featured leaderboards
  * Configuring gamification parameters (EXP rates, badge thresholds)

---

## 3. 🔐 Authentication

* Facebook Login is the **only** supported sign-in method (MVP)
* One Facebook account = one player account (enforced server-side)
* Duplicate detection is based on Facebook user ID
* Profile name and photo are seeded from Facebook but can be edited after first login
* New accounts are redirected to a phone number onboarding screen before reaching the home screen; this step cannot be skipped
* Session tokens use standard OAuth 2.0 flow; refresh handled transparently

---

## 4. 🏢 Club System

---

### 4.1 Core Concept

* Clubs are the **primary organizational unit** of the app
* All queue sessions, leaderboards, and statistics are scoped under a club
* **EXP**, **MMR**, and **ranked** progression apply only to **club queue** sessions with **Schedule type = MMR**; player-organized and **Fun Games** schedules are recorded but do not grant match-based EXP or MMR
* A player can belong to multiple clubs simultaneously
* Que Masters are assigned per club and have no cross-club authority

---

### 4.2 Club States

| State    | Description                                             |
|----------|---------------------------------------------------------|
| Active   | Accepting members, sessions can be created              |
| Paused   | Visible but no new sessions or join requests allowed    |
| Archived | Read-only; history retained, no new activity            |

---

### 4.3 Joining a Club

Players can join via three methods:

---

#### 🔗 Invite Link / QR Code

* Generated by the Club Owner (one active link at a time)
* Link can be:
  * Enabled or disabled at any time by the Club Owner
  * Rotated (old link invalidated, new one generated)
* When a player follows the link:
  * If Auto-Approve is **ON**: they are immediately added as a member
  * If Auto-Approve is **OFF**: a join request is created for Club Owner review
* QR code is a visual representation of the same invite link

---

#### 📩 Direct Invite

* Sent by Club Owner to a specific player (by searching their name/profile)
* Player receives an in-app notification and can accept or decline
* Does not require Auto-Approve to be ON; bypasses the request queue

---

#### 📝 Request to Join

* Player finds the club via search or a shared link and requests to join
* If Auto-Approve is **ON**: request is auto-accepted immediately
* If Auto-Approve is **OFF**: placed in a pending queue for Club Owner review
* Club Owner can approve or reject with an optional note
* Player is notified of the outcome either way

---

### 4.4 Member Lifecycle

```
Invited / Requested
       ↓
  Pending Review  ←── (if auto-approve OFF)
       ↓
    Active Member
       ↓
  Removed / Left
```

* A removed member can re-request unless blocked by the Club Owner
* A member who leaves voluntarily can re-join via any method

---

### 4.5 Club Owner Controls

#### Membership Settings

| Setting        | Options  | Default |
|----------------|----------|---------|
| Auto Approve   | ON / OFF | OFF     |
| Invite Link    | ON / OFF | ON      |

#### Moderation

* View and act on pending join requests (approve / reject)
* Remove any active member from the club
* View a log of past membership actions

---

### 4.6 Que Master Assignment

* Only the Club Owner can assign or revoke the Que Master role
* The Club Owner can assign **any number of active club members** as Que Masters simultaneously — bulk assignment is supported
* Assignment is per-club — the same player may hold the role in multiple clubs
* Only current active club members are eligible
* Que Masters can co-manage sessions simultaneously in real-time (see 8.12)

---

### 4.7 Club Owner Statistics View

The Club Owner has a dedicated **Statistics tab** covering membership analytics and financial summaries:

#### Membership Analytics

* **New members** — count of members who joined within a selected time range (7d / 30d / 90d / custom)
* **Consistent members** — members who attended ≥ 3 sessions in the last 30 days (threshold configurable by Club Owner)
* **Members via invite link** — count and list of members who joined through the invite link / QR code, tracked per link generation

#### Financial Analytics

* **Spending per queue schedule** — per-session breakdown: court cost, shuttle cost, total, markup, players, collected, outstanding
* **Aggregate financial summary** — configurable time range (per session / 7d / 30d / 90d / this month / last month / 3 months / 6 months / this year / all time / custom):
  * Total spent (court + shuttle costs)
  * Total collected (confirmed player payments)
  * Outstanding (unpaid/partial amounts)
  * Markup profit (total markup collected above actual cost)
  * Sessions held, average cost per session, average cost per player

#### Blacklisted Players

* View and manage the club blacklist directly from the Statistics tab

---

### 4.8 Player Blacklist

The Club Owner can permanently block specific players from accessing the club:

* Blacklisted players are **silently blocked** from all entry points — invite link, join request, direct invite
* Players receive generic error messages and are never told they are blacklisted
* A player must be **removed from the club first** before they can be blacklisted
* Blacklist is per-club — no effect on the player's other clubs
* The Club Owner can remove a player from the blacklist at any time (does not re-add them)
* All blacklist actions are logged with timestamp and optional internal note

---

## 5. 👤 Player Profile System

---

### 5.1 Basic Profile

| Field          | Notes                                         |
|----------------|-----------------------------------------------|
| Name           | Editable after Facebook import                |
| Profile photo  | Editable after Facebook import                |
| Playing level  | Beginner / Intermediate / Advanced (self-set) |
| Phone number   | Collected at onboarding; private              |
| Joined date    | System-generated                              |

Playing level is the player's **self-declared** level. It is separate from the computed Skill Rating (Section 6), which is derived from match data and peer assessment.

---

### 5.2 Play Style

Players select one or more preferences to help Que Masters and partners understand their game:

* **Format preference**: Singles / Doubles / Both
* **Court position** (doubles): Front / Back / Both
* **Play mode**: Competitive / Social / Both

These are informational only and do not affect queue priority or matching algorithms.

---

### 5.3 🎒 Gear Showcase (Multi-Item System)

Players can add **multiple items per category**. Each item functions like a **mini post** — it has a title, description, and optional purchase links.

Categories:
* Rackets
* Shoes
* Bags

Items are visible on the player's public profile and are purely social/informational.

---

### 5.3.1 🏸 Rackets

| Field         | Options / Notes                        |
|---------------|----------------------------------------|
| Brand         | Text                                   |
| Model         | Text                                   |
| Balance type  | Head Heavy / Head Light / Even Balanced |
| String brand  | Text                                   |
| String model  | Text                                   |
| String tension| Numeric (lbs or kg)                    |
| Grip          | Optional text                          |
| Where to buy  | One or more URLs                       |
| Title         | Short label for the post               |
| Description   | Free text caption                      |

---

### 5.3.2 👟 Shoes

| Field       | Options / Notes              |
|-------------|------------------------------|
| Brand       | Text                         |
| Size        | Numeric                      |
| Fit type    | Wide / Narrow / Standard (future) |
| Where to buy| One or more URLs             |
| Title       | Short label for the post     |
| Description | Free text caption            |

---

### 5.3.3 🎒 Bags

| Field         | Options / Notes          |
|---------------|--------------------------|
| Brand         | Text                     |
| Size/Capacity | Text (e.g. "6-racket")   |
| Where to buy  | One or more URLs         |
| Title         | Short label for the post |
| Description   | Free text caption        |

---

### 5.4 Player Statistics

Aggregated across all clubs and sessions the player has participated in.

| Stat                  | Description                                              |
|-----------------------|----------------------------------------------------------|
| Games played          | Total completed matches                                  |
| Wins / Losses         | Match outcomes (requires score submission)               |
| Win rate              | Wins ÷ Games played (%)                                  |
| Sessions attended     | Number of distinct queue sessions participated in        |
| Clubs joined          | Number of clubs the player is or has been a member of    |
| Tournaments played    | Future — when tournament module is live                  |
| Average skill rating  | Rolling average of all received ratings (weighted)       |
| EXP points            | Gamification currency (see Section 14)                   |

---

### 5.5 Advanced Stats

Available once enough match history is accumulated:

| Stat                   | Description                                                       |
|------------------------|-------------------------------------------------------------------|
| Most frequent partner  | Player paired with most often in doubles                          |
| Most frequent opponent | Player faced most often                                           |
| Best partner (win rate)| Partner with whom the player has the highest win rate             |
| Toughest opponent      | Opponent with the highest win rate against this player            |
| Peak skill rating      | Highest skill rating ever recorded                                |
| Rating trend           | Last 10-match rating direction (ascending / stable / descending)  |

---

## 6. 📊 Skill Rating System

**MMR** (competitive matchmaking rating) is separate from this **Skill Rating**: MMR changes only on **club MMR** schedules; these six dimensions still update from post-match reviews across **all** session types when matches complete.

---

### Skill Dimensions

Ratings are structured across **6 observable dimensions**, each rated 1–5 independently after a match. The overall rating is the weighted average across dimensions.

| Dimension | Sub-skills covered |
|-----------|-------------------|
| Attack | Smash, Half Smash, Jump Smash, Cross Smash, Drive, Cross Drive, Backhand Smash |
| Defense | Clear, Backhand, Backhand Clear |
| Net & Touch | Net Play, Setting, Push, Drop, Backhand Drop |
| Precision & Control | Slice, Backhand Slice, Cross Drop, Placing, Deception |
| Athleticism | Footwork, Anticipation |
| Game Intelligence | Critical Thinking, Teamwork, Deception (tactical), Placing (tactical) |

Dimensions and sub-skills are defined in `constants/skill_dimensions` and managed via the Admin portal — no code deploy needed to add or modify them.

Raters may **skip** any dimension they did not observe. Skipped dimensions are excluded from the average, not counted as 0.

---

### 6.1 Scale

* **1** → Poor
* **2** → Below Average
* **3** → Average
* **4** → Above Average
* **5** → Strong

Applied per dimension. The overall displayed rating is the weighted average of all dimension scores, rounded to one decimal place (e.g. 3.7).

---

### 6.2 Rating Sources & Weights

| Source          | Weight | Notes                                           |
|-----------------|--------|-------------------------------------------------|
| Que Master      | High (×3)   | Most trusted; direct observer              |
| Umpire          | High (×3)   | Watched the match end-to-end               |
| Opponent        | Medium (×2) | May be biased; partially discounted        |
| Partner         | Medium (×1.5)| Context-aware but also biased             |
| Self-assessment | Low (×1)    | Baseline only; phased out as external data accumulates |

* Self-assessment is set **per dimension** at profile setup
* All other ratings are submitted post-match, per dimension
* Ratings from the same source type are averaged per dimension before combining across sources
* Self-assessment weight phases out after 5+ external match assessments per dimension

---

### 6.3 Rating Submission Window

* Rating opens: immediately after match is completed
* Rating closes: 24 hours after match completion
* Ratings submitted outside this window are discarded

---

### 6.4 Anti-Sandbagging System

Sandbagging = deliberately maintaining a lower rating to gain unfair queue or bracket advantages.

Detection signals:

| Signal                        | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| Win rate vs. rated opponents  | Consistently winning against higher-rated players               |
| Rating trend divergence       | External ratings are significantly higher than self-assessment  |
| Partner / opponent discrepancy| All partners rate high; player self-rates low                   |
| Historical rating pattern     | Sudden drops after being elevated; yo-yo behavior               |

When sandbagging is detected:
* Player's displayed level is overridden by the system's computed level
* A flag is added to their profile visible to Que Masters and Club Owners
* Club Owner can review and escalate to Admin (future)

---

## 7. 📝 Review System

---

### 7.1 Overview

After each match, all involved parties may submit a review. Reviews serve two purposes:

1. **Skill rating updates** — numeric ratings feed into the player's rolling average
2. **Behavioral record** — text reviews build a player's reputation over time

---

### 7.2 Review Types

#### Player → Player Reviews

* Each player can review every other player in the same match
* Text review is **anonymous** — the reviewed player sees the review text but not the author
* Before viewing anonymous reviews, the player must acknowledge a warning (reviews may be critical)
* Numeric skill rating component is not anonymous to the system but is displayed as an aggregate

---

#### Que Master Reviews

* Que Master rates players on a 1–5 scale after match finalization
* Can optionally add a short note (not anonymous)
* Que Master's rating carries the highest weight in the skill calculation

---

#### Umpire Reviews

* Umpire submits the **official final score** (required for match completion when an umpire is assigned)
* Can additionally rate each player on a 1–5 scale (optional)
* Umpire rating carries high weight, equivalent to Que Master

---

### 7.3 Review Moderation

* Profanity filter applied automatically on text submission
* Reviews that fail the filter are rejected with an error prompt
* Future: players can flag a review for manual review by the Club Owner or Admin
* Repeated abuse may result in review privileges being suspended

---

### 7.4 Match Completion Rule

A match is marked **complete** only when ALL of the following are satisfied:

```
IF umpire is assigned:
    umpire must submit the final score

AND one of:
    all players in the match have submitted their reviews
    OR Que Master manually finalizes the match
```

A Que Master finalization overrides the review wait — useful when players leave without reviewing.

---

### 7.5 Completion Flow

```
1. Match ends on court
2. Umpire submits final score (if assigned)
3. Players receive review prompt (24-hour window)
4. Players submit reviews
5. Que Master finalizes (or waits for all reviews)
6. System marks match as complete
7. Leaderboard and stats update
8. EXP and MMR apply only for **club queue — MMR (competitive)** sessions; player-organized and Fun Games record standings and skill reviews but grant no match-based EXP or MMR
```

---

## 8. 🏸 Queue Session System

---

### 8.1 Definition

A **Queue Session** is a bounded, time-limited badminton event hosted under a club, consisting of:

* A set of reserved courts
* A roster of admitted players
* A managed rotation queue of matches
* Real-time match tracking and scoring

**Session origin:** **Player-organized** (any Player in the club) vs **club queue** (Que Master or Club Owner). Only **club queue** with **Schedule type = MMR (competitive)** awards **EXP**, **MMR**, and **ranked** progression. **Fun Games** and **player-organized** sessions still record matches and standings; peer **skill dimension** ratings can still apply on completion. See `business_logic/client_app/08_queue_session.md` for the full matrix.

---

### 8.2 Session Setup

The **session host** (creating Player, or Que Master / Club Owner for club queue) configures the session before opening it to players:

| Setting            | Description                                                       |
|--------------------|-------------------------------------------------------------------|
| Schedule type      | **Club queue only:** MMR (competitive) vs Fun Games (no EXP/MMR). Omitted for player-organized (always informal). |
| Location           | Venue name and optional address                                   |
| Date & Time        | Start time; optional end time                                     |
| Number of courts   | How many courts are reserved                                      |
| Players per court  | Typically 4 (doubles) or 2 (singles)                              |
| Shuttle type       | Brand/feather/plastic (informational, used in cost calculation)   |
| Shuttle cost       | Cost per shuttle tube (used in cost calculation)                  |
| Court cost         | Total court rental cost                                           |
| Match format       | Best of 1 / Best of 3; score limit (e.g. 21 points)              |
| Session visibility | Club members only / Open via link                                 |

---

### 8.2.1 Slot Formula

```
total_slots = players_per_court × number_of_courts
```

Total slots determines the maximum number of **Accepted** players. Players beyond this capacity are **Waitlisted**.

---

### 8.3 Player Admission States

| State      | Meaning                                                              |
|------------|----------------------------------------------------------------------|
| Accepted   | Within capacity; confirmed spot in the session                       |
| Waitlisted | Over capacity; will be moved to Accepted if a slot opens             |
| Reserved   | Manually held by Que Master for a specific player (e.g. late arrival)|

Waitlist is managed **FIFO** (first waitlisted = first promoted) unless Que Master manually reorders.

When an Accepted player exits early, the top Waitlisted player is automatically notified and promoted.

---

### 8.3.1 Join Methods

| Method | Description                                              |
|--------|----------------------------------------------------------|
| App    | Player registers through the session's in-app listing    |
| QR     | Player scans a session-specific QR code at the venue     |

---

### 8.4 Player Status (In-Session)

Player status represents their real-time state during a session.

| Status        | Set By              | Meaning                                           |
|---------------|---------------------|---------------------------------------------------|
| Not Arrived   | System (default)    | Player registered but not yet at venue            |
| I Am In       | Player              | Player has arrived at venue                       |
| I Am Prepared | Player              | Player is ready to play (warmed up, on standby)   |
| Playing       | System (auto)       | Player is currently in an active match            |
| Waiting       | System (auto)       | Player is queued for next match                   |
| Resting       | Player or Que Master| Player needs a break; skipped in rotation         |
| Eating        | Player or Que Master| Player is on a meal break; skipped in rotation    |
| Suspended     | Que Master only     | Player temporarily removed from rotation          |
| Exited        | Player or Que Master| Player has left the session entirely              |

**Queue rotation only considers players with status: I Am Prepared, Waiting, or Resting (if Que Master includes them).**

---

### 8.5 Queue Flow

The queue is the ordered list of upcoming matches. It is managed by the Que Master and visible to all participants.

The queue displays:

* **Active matches**: which courts are in use, who is playing, current score (if umpire is live scoring)
* **Next matches**: ordered list of queued matches
* **Estimated wait time**: calculated as `matches_ahead × average_match_duration`

Average match duration is derived from completed matches in the same session, defaulting to the Que Master's configured match format time estimate.

---

### 8.6 🔔 Smart Monitoring

The system monitors active match scores in real-time when a Umpire is live-scoring.

| Trigger              | Action                                                          |
|----------------------|-----------------------------------------------------------------|
| Score reaches 90% of win condition (e.g. 19/21) | Notify Que Master: "Match nearing end" |
| Score reaches 90%    | Prompt Que Master to begin preparing next match                 |
| Match ends           | Auto-trigger Umpire score submission prompt                     |
| No live score present| Que Master receives timer-based reminder at configured intervals|

The 90% threshold is configurable per session by the Que Master.

---

### 8.7 Exit System

A player may exit a session before it ends.

* Early exit is always allowed — players cannot be locked in
* **Full session payment is required** before the slot is released (Que Master confirms payment)
* Once confirmed, the player's status is set to **Exited**
* Their slot opens and the top Waitlisted player is promoted (if any)
* Exited players cannot re-enter the session queue but can still view it

---

### 8.8 Attendance Confirmation

Attendance is a two-step process:

1. **"I Am In"** — player signals they have arrived at the venue
2. **"I Am Prepared"** — player signals they are ready to play and can be placed in a match

Both are player-triggered. The Que Master can override either status manually (e.g. mark a player as "I Am Prepared" if they are visibly ready but haven't tapped the button).

A player who is **Accepted** but does not mark "I Am In" within a configurable window (default: 15 minutes after session start) can be automatically moved to Waitlisted by the Que Master.

---

### 8.9 🧑‍⚖️ Umpire System

---

#### Assignment

* An umpire is a player in the session who is not playing in the current match
* Assigned per match by the Que Master before or when the match starts
* Optional — matches can proceed without an umpire (score submitted by Que Master instead)

---

#### Interface

* Umpire accesses a dedicated **mobile scoreboard view** for their assigned match
* Interface shows:
  * Team A vs Team B
  * Current score (tap to increment)
  * Undo last point
  * Set tracking (for best-of-3)
  * Submit final score button

* Live score is broadcast in real-time to the Queue Master interface and player queue view

---

#### Completion

1. Umpire taps "Submit Final Score"
2. System confirms the score and marks umpire's duty complete
3. Que Master receives a notification
4. Match moves to the review phase
5. Leaderboard updates with the result

---

### 8.10 🎛️ Queue Master Interface

The Queue Master interface has three primary views:

---

#### Court View

Displays the physical court layout:

* Each court shown as a card with:
  * Court number / name
  * Current match (Team A vs Team B)
  * Live score (if umpire is active)
  * Match duration elapsed
  * Status: Active / Empty / On Hold
* Empty courts are highlighted as available for the next queued match

---

#### Queue View

* Horizontally scrollable list of upcoming matches (slider)
* Each match card shows: Team A vs Team B, player levels, estimated start time
* **Drag to reorder** matches in the queue
* Swipe to delete a queued match
* Tap to edit team composition

---

#### Add Match Interface

Que Master builds a new match by selecting players from the **Player Pool**:

| Column        | Description                          |
|---------------|--------------------------------------|
| Name          | Player's display name + photo        |
| Level         | Playing level (self-declared)        |
| Skill rating  | Computed rating (1–5 scale)          |
| Waiting time  | Time since last match ended          |
| Games played  | Total matches in this session        |

**Default sort order**: Waiting Time (longest wait first)

Additional sort options:
* Name (A–Z)
* Level
* Skill rating
* Games played (ascending — fewest first, for fairness)

Real-time search filters the player pool by name as the Que Master types.

Teams are balanced suggestions only — Que Master has full override control.

---

#### Multi-Que Master

* Multiple Que Masters assigned to the same club can manage the same session simultaneously
* All queue changes (add, reorder, delete, status updates) sync in real-time across all active Que Master sessions
* Conflict resolution: last-write-wins with a visible change log
* Each Que Master's identity is shown on changes made (audit trail)

---

### 8.11 👥 Player View (Read-Only)

Players see a simplified, read-only version of the session:

* **Courts tab**: active matches, live scores, court status
* **Queue tab**: upcoming matches in order, estimated wait time for their own next match
* **Standings tab**: current session leaderboard (wins, games played)

Players **cannot**:
* Modify the queue
* Change other players' statuses
* Access cost or payment data

---

### 8.12 🔄 Real-Time System

All session data is synchronized in real-time using WebSocket connections (or equivalent long-polling fallback).

Synced across:

| Actor       | Receives updates on                                            |
|-------------|----------------------------------------------------------------|
| Que Master  | Queue changes, score updates, player status, payment status    |
| Players     | Queue position, match assignment, live scores, wait time       |
| Umpires     | Match assignment, score confirmation                           |

Reconnection is automatic. Offline state shows a banner; local data is preserved until sync resumes.

---

## 9. 💰 Cost System

---

### 9.1 Session Cost Inputs (Que Master)

| Input           | Description                                         |
|-----------------|-----------------------------------------------------|
| Court cost      | Total rental cost for all courts for the session    |
| Shuttle cost    | Cost per shuttle tube × estimated shuttles used     |
| Number of players | Accepted players (used for per-player calculation)|
| Optional markup | Flat or percentage added on top of actual cost      |

---

### 9.2 Per-Player Cost Calculation

```
total_cost = court_cost + (shuttles_used × shuttle_cost_per_tube)
per_player_cost = ceil(total_cost / number_of_accepted_players)

if markup is set:
    per_player_cost = per_player_cost + markup_amount
```

The Que Master can preview the per-player cost before the session starts and update it during the session as shuttle usage changes.

---

### 9.3 Player Payment Tracking

Each accepted player has a payment record visible to the Que Master:

| Status   | Meaning                                |
|----------|----------------------------------------|
| Unpaid   | Default on joining session             |
| Paid     | Que Master manually marks as paid      |
| Partial  | Paid less than the required amount     |

* Payment is tracked manually by the Que Master (cash or agreed offline method)
* Future: integration with payment platforms (GCash, PayMaya, etc.)

Early-exiting players are required to settle their payment before their slot is released (Que Master confirms before marking the player as Exited).

---

## 10. 📈 Leaderboard

---

### 10.1 Scopes

| Scope         | Description                                                  |
|---------------|--------------------------------------------------------------|
| Session       | Rankings within one queue session (resets each session)      |
| Club          | Cumulative rankings across all sessions within a club        |
| Global        | Platform-wide rankings across all clubs (future)             |

---

### 10.2 Ranking Criteria

Session and Club leaderboards rank players by:

1. **Wins** (primary sort)
2. **Win rate** (secondary — percentage of matches won)
3. **Games played** (tertiary — more games = more data, used as tiebreaker)

For club leaderboards, only matches that were fully completed (with score) are counted. Session standings include **player-organized**, **Fun Games**, and **MMR** schedules. Club cumulative win/loss includes all three; an optional future **MMR-only** filter may be added later.

---

### 10.3 Data Sources

| Source     | What it provides                      |
|------------|---------------------------------------|
| Umpire     | Official score; result is authoritative|
| Que Master | Manual score entry if no umpire assigned|

Matches without any score submission are marked as "unscored" and excluded from ranking calculations.

---

### 10.4 Leaderboard Display

* Real-time updates during active sessions
* Snapshot published at session close (post-session leaderboard)
* Shareable via link or image export
* Shows: rank, player name, photo, wins, games played, win rate, skill rating

---

## 11. 🏆 Tournament (Future)

Planned for a later phase. Tournament features will include:

* Bracket generation (single elimination, double elimination, round robin)
* Skill-tier grouping to ensure fair matchups
* Dedicated tournament admin role
* Tournament-specific leaderboards separate from queue sessions
* EXP multiplier for tournament wins

---

## 12. 📜 Match History

Every player has a persistent match history across all clubs and sessions.

Each history entry contains:

| Field           | Description                                    |
|-----------------|------------------------------------------------|
| Date            | When the match was played                      |
| Club            | Which club the match was under                 |
| Session         | Which queue session                            |
| Opponent(s)     | Players faced                                  |
| Partner(s)      | Teammates (doubles)                            |
| Score           | Final score (if submitted)                     |
| Result          | Win / Loss / Draw / Unscored                   |
| Reviews received| Aggregate of ratings from that match           |
| Reviews given   | Reviews the player submitted                   |

Match history is visible on the player's public profile (reviews received are shown in aggregate, not per-match raw).

---

## 13. 🔗 Sharing

Shareable items and their share format:

| Item               | Share Format                                     |
|--------------------|--------------------------------------------------|
| Player profile     | Public link; shows bio, stats, gear showcase     |
| Match result       | Card image with score, players, club             |
| Session leaderboard| Snapshot image or live link                      |
| Club leaderboard   | Filterable live link                             |
| Invite link        | Direct join link or QR code                      |

Sharing generates a preview card (Open Graph compatible for social media posting).

---

## 14. ⚙️ Gamification

---

### 14.0 MMR & eligibility

**MMR** is the competitive ladder rating; it moves only on **club queue — MMR (competitive)** matches. It is separate from **Skill Rating** (six peer-reviewed dimensions). **Player-organized** and **Fun Games** sessions: **no EXP**, **no MMR**; **MMR** sessions: EXP/MMR can go up or down (mixed-rank asymmetric rules — `business_logic/client_app/14_gamification.md` §14.3). Full tables and Admin-configurable parameters live in the client_app doc.

---

### 14.1 EXP (Experience Points)

Match-linked EXP rewards participation and outcomes **only** in **MMR** club schedules (baseline amounts below; may scale with mixed-rank rules). **Completing profile** is one-time and not session-gated.

| Action                              | EXP Earned         |
|-------------------------------------|--------------------|
| Playing a match                     | +10 EXP (baseline) |
| Winning a match                     | +15 EXP (baseline) |
| Submitting a review after a match   | +5 EXP             |
| Being rated 4 or 5 by opponents     | +5 EXP bonus       |
| Acting as umpire for a match        | +8 EXP             |
| Completing profile (gear, bio, etc.)| +20 EXP (one-time) |
| Attending a session                 | +5 EXP             |

EXP is purely cosmetic at MVP — it contributes to the player's visible level badge and ranking tier. No in-app purchases or pay-to-win mechanics. On **MMR** schedules, **losses can reduce EXP**; voided matches reverse EXP and MMR attributed to that match.

---

### 14.2 Ranking Tiers (EXP-based)

| Tier        | EXP Required | Badge              |
|-------------|--------------|--------------------|
| Shuttle Bird| 0+           | Default            |
| Rally Rookie| 100+         | Bronze             |
| Net Fighter | 300+         | Silver             |
| Court Ace   | 600+         | Gold               |
| Smash Legend| 1000+        | Platinum           |
| Elite Master| 2000+        | Diamond (Admin set)|

Tier thresholds are configurable by Admin. Tier is displayed on player profile and in the queue pool.

---

### 14.3 Asymmetric EXP / MMR (mixed ranks)

On **MMR** club schedules only, when teammates span a large skill gap: **lower-rated** players gain **less** EXP/MMR on wins and lose **more** on losses when paired with a much **higher-rated** partner; **higher-rated** players gain **more** on wins and lose **less** on losses in that context. Details: `business_logic/client_app/14_gamification.md` §14.3.

---

### 14.4 Badges (Future)

One-time achievement badges:

* First Match Played
* First Win
* 10 / 50 / 100 Matches Played
* Perfect Session (all matches won in a session)
* Top of Leaderboard (session)
* Most Improved (rating increase > 1 point in 30 days)
* Gear Enthusiast (added 3+ gear items)

---

## 15. 📱 Notifications

---

### 15.1 Session Reminders

Sent to all Accepted players before a session starts:

| Trigger           | Notification                                 |
|-------------------|----------------------------------------------|
| 2 hours before    | "Your session starts in 2 hours"             |
| 1 hour before     | "1 hour until your session at [venue]"       |
| 30 minutes before | "Your session starts in 30 minutes"          |
| 5 minutes before  | "Session is starting! Head to the court"     |
| Session starts    | "Session has started. Mark yourself as In"   |

---

### 15.2 In-Session Notifications

| Trigger                        | Recipient        | Message                                      |
|--------------------------------|------------------|----------------------------------------------|
| Player added to next match     | Player           | "You're up next on Court [X]"                |
| Match assigned to umpire       | Umpire           | "You're umpiring the next match on Court [X]"|
| Score reaches 90% threshold    | Que Master       | "Match on Court [X] is nearing end"          |
| Match completed                | All participants | "Match complete. Submit your review now"     |
| Waitlisted player promoted     | Player           | "A slot opened! You've been accepted"        |
| Payment reminder               | Player           | "Please settle your session fee"             |

---

### 15.3 Post-Session Notifications

| Trigger                  | Recipient   | Message                                    |
|--------------------------|-------------|--------------------------------------------|
| Session ends             | All players | "Session over. View the final leaderboard" |
| Review window closing    | Player      | "2 hours left to submit your match review" |
| Leaderboard published    | All players | "Final standings for [session] are live"   |

---

## 16. 🚀 MVP Plan

---

### Phase 1 — Core System

Goal: End-to-end queue session management that works without ratings or gamification.

* Facebook authentication
* Player profile (basic: name, photo, level, play style)
* Club creation and management
* Club membership (invite link, QR, direct invite, join request)
* Queue session creation and setup
* Player admission (accepted / waitlisted / reserved)
* Player status management (all statuses)
* Queue management interface (court view, queue view, add match)
* Real-time sync across Que Master, players, umpires
* Umpire scoreboard interface
* Match completion logic (with/without umpire)
* Cost calculation and payment tracking
* Session leaderboard (win/loss based)
* Match history (basic: result, date, opponents)
* Session reminder notifications (2h, 1h, 30m)

---

### Phase 2 — Ratings & Reviews

Goal: Introduce player reputation and skill tracking.

* Skill rating system (all sources, weighted average)
* Post-match review submission (player, Que Master, umpire)
* Anonymous text reviews with viewing flow
* Anti-sandbagging detection (basic: external vs. self-assessment divergence)
* Advanced player statistics (win rate, frequent partners/opponents)
* EXP points and ranking tiers
* In-session and post-session notifications
* Club leaderboard (cumulative)
* Sharing (match cards, leaderboard images, profile links)
* Profanity filter on reviews

---

### Phase 3 — Tournaments & Platform Growth

Goal: Expand beyond casual sessions into structured competition.

* Tournament module (brackets, skill tiers, dedicated admin)
* Global leaderboard
* Badge / achievement system
* Admin role (club application & demotion approvals, moderation, gamification config)
* Payment platform integrations (GCash, PayMaya, etc.)
* Reporting system for flagged reviews
* Advance player-to-player search and discovery
* Notification preferences (player-configurable)

---

## 17. ⚠️ Risks & Mitigations

| Risk                         | Impact | Mitigation                                                                 |
|------------------------------|--------|----------------------------------------------------------------------------|
| Rating abuse / gaming         | High   | Weighted sources, anti-sandbagging detection, Que Master override          |
| Sandbagging                   | High   | System-computed level displayed when discrepancy detected                  |
| Review toxicity               | Medium | Profanity filter, anonymous display, future reporting + moderation         |
| Real-time sync failures       | High   | Auto-reconnect, offline state banner, last-known-state preservation        |
| Queue disputes                | Medium | Full Que Master audit trail, drag-reorder visible to all Que Masters       |
| Player no-shows               | Medium | Attendance confirmation flow, Que Master override, auto-waitlist promotion |
| Cost calculation disagreements| Medium | Transparent formula visible to all players, Que Master manual override     |
| UX complexity for Que Masters | High   | Dedicated onboarding flow, context-sensitive help tooltips                 |
| Duplicate Facebook accounts   | Medium | Server-side Facebook user ID deduplication at registration                 |

---

## 18. 🔒 Canonical Rules

```
- All users start as Players upon registration

- Owning a club requires an admin-approved club application per club (`database/12_club_governance.md`); 24h SLA auto-reject on stale pending rows

- Que Master is not a global role; it is assigned per club by the Club Owner
- Club Owner can assign multiple members as Que Masters simultaneously (no cap; bulk assignment supported)

- Only active club members can be assigned as Que Master

- Players join clubs via: QR / Link, Direct Invite, or Join Request

- Blacklisted players are silently blocked from all club entry points
- A player must be removed from the club before they can be blacklisted
- Blacklist is per-club only — no effect on the player's other clubs

- Queue session slots = players_per_court × number_of_courts

- Players beyond capacity are waitlisted (FIFO)

- Player statuses that count for queue rotation: I Am Prepared, Waiting
  (Resting can be included at Que Master discretion)

- Queue system is real-time; changes sync across all Que Masters, players, and umpires

- Players have read-only access to queue, courts, and standings

- Match completion requires:
    - Umpire score submission (if umpire is assigned)
    - AND: all player reviews submitted OR Que Master manual finalization

- Ratings are submitted in a 24-hour window after match completion

- Self-assessment weight is reduced after 5+ external ratings are received

- Per-player cost = ceil((court_cost + shuttle_cost) / accepted_players) + optional markup

- Early exit requires full payment confirmation before slot is released

- Club Owner statistics view covers:
    - New members, consistent members, and invite-link members
    - Per-session and aggregate financial summaries (spending + markup profit)
    - Blacklist management
- Financial data in the statistics view is visible to Club Owner only

- Any Player may create player-organized queue sessions under their club
- Club queue sessions are created by Que Master or Club Owner with Schedule type: MMR (competitive) or Fun Games (no EXP/MMR)
- Player-organized and Fun Games: no EXP, no MMR, not ranked; standings and history still recorded; skill dimension reviews may still apply
- Club MMR schedules: EXP and MMR may increase or decrease; asymmetric mixed-rank rules per 14_gamification.md
- Voided matches reverse EXP and MMR applied to that match
```

---

## 🧠 Big Picture

You are building:

> A **badminton operating system** — the infrastructure layer that every club and serious casual player reaches for when they pick up a racket.
