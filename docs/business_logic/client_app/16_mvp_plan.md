# 16 — MVP Plan

## Overview

Development is split into three phases. Each phase builds on the previous and is designed to be independently shippable and valuable. The goal is to get a working, useful product into users' hands as quickly as possible, then layer complexity.

---

## Phase 1 — Core System

**Goal**: End-to-end queue session management. A Que Master can run a complete badminton session through the app — from setup to match finalization — without needing a whiteboard, group chat, or paper list.

**Definition of Done for Phase 1**: A Club Owner can create a club, a Que Master can run a session from start to finish, and players can join, see their queue position, and have their match recorded.

### Features

#### Authentication & Accounts

* [ ] Facebook Login (OAuth 2.0)
* [ ] Single-account enforcement (Facebook user ID deduplication)
* [ ] Player profile creation (name, photo from Facebook; editable)
* [ ] Playing level selection (Beginner / Intermediate / Advanced)
* [ ] Play style preferences (format, court position, play mode)

#### Club System

* [ ] **Club application** flow: submit `club_applications`, Admin approve/reject in Admin app ([`../../database/12_club_governance.md`](../../database/12_club_governance.md))
* [ ] Club creation (post-approval), editing, and **archive** (no hard delete)
* [ ] Membership settings: Auto-Approve ON/OFF, Invite Link ON/OFF
* [ ] Join methods: Invite Link / QR, Direct Invite, Request to Join
* [ ] Pending join request management (approve / reject)
* [ ] Member removal
* [ ] Que Master assignment and revocation

#### Queue Session

* [ ] Session creation with full setup (courts, players per court, shuttle, cost, format)
* [ ] Slot formula: `players_per_court × number_of_courts`
* [ ] Player admission: Accepted / Waitlisted / Reserved
* [ ] FIFO waitlist with auto-promotion on exit
* [ ] Player join via app listing and QR code
* [ ] Player status management: all 9 statuses (Not Arrived, I Am In, I Am Prepared, Playing, Waiting, Resting, Eating, Suspended, Exited)
* [ ] Attendance confirmation flow (two-step: "I Am In" → "I Am Prepared")
* [ ] Que Master override for any player status
* [ ] No-show alert (15-minute configurable window)

#### Queue Management Interface (Que Master)

* [ ] Court View: court cards with match, score, status
* [ ] Queue View: drag-to-reorder slider, delete match, tap to edit
* [ ] Add Match interface: player pool with name, level, waiting time, games played
* [ ] Player pool sorting (waiting time default; name, level, games played)
* [ ] Real-time search in player pool
* [ ] Multi-Que Master support: shared real-time control, last-write-wins, audit trail

#### Umpire System

* [ ] Umpire assignment per match
* [ ] Mobile scoreboard interface (tap to score, undo, set tracking)
* [ ] Live score broadcast to all views
* [ ] Score submission flow with confirmation dialog
* [ ] Score dispute / void flow (Que Master override)

#### Match Completion

* [ ] Match completion logic: umpire score + reviews or Que Master finalization
* [ ] Que Master manual finalization
* [ ] Match status transitions (In Progress → Review Phase → Complete / Voided)

#### Cost System

* [ ] Court cost and shuttle cost input
* [ ] Shuttles used tracker (updated mid-session)
* [ ] Per-player cost formula with optional markup
* [ ] Cost preview before session opens
* [ ] Real-time cost update as shuttle count changes
* [ ] Per-player payment tracking: Unpaid / Partial / Paid
* [ ] Payment panel for Que Master
* [ ] Early exit payment confirmation

#### Player View (Read-Only)

* [ ] Courts tab: live court status and scores
* [ ] Queue tab: upcoming matches, estimated wait time
* [ ] Standings tab: session leaderboard (wins, games, win rate)

#### Match History (Basic)

* [ ] Match record creation on queue add
* [ ] Result tracking (Win / Loss / Draw / Unscored)
* [ ] Match history list on player profile (date, club, opponents, score, result)

#### Session Leaderboard

* [ ] Real-time session leaderboard (wins, losses, win rate, games played)
* [ ] Post-session snapshot

#### Notifications (Basic)

* [ ] Session reminders: 2h, 1h, 30m before start
* [ ] "Session has started" notification
* [ ] Waitlist promotion notification
* [ ] Match assignment notification ("You're up next")

#### Real-Time Sync

* [ ] WebSocket connection for session state
* [ ] Auto-reconnect with offline banner
* [ ] Sync across Que Masters, players, umpires

---

## Phase 2 — Ratings & Reviews

**Goal**: Introduce player reputation, skill measurement, and progression. Players build an identity that persists and grows across sessions.

**Definition of Done for Phase 2**: After every match, players can rate each other, skill ratings are computed and displayed, the leaderboard reflects cumulative club performance, and EXP tiers are visible on profiles.

### Features

#### Skill Rating System

* [ ] 1–5 rating scale on player profile
* [ ] Rating sources: player, Que Master, umpire (with weights)
* [ ] Self-assessment at profile setup
* [ ] Weighted rolling average calculation
* [ ] Self-assessment phaseout (after 5 external ratings)
* [ ] 24-hour rating submission window
* [ ] Anti-sandbagging detection (divergence signals)
* [ ] System-computed level override on flag
* [ ] Sandbagging flag visible to Que Masters and Club Owners

#### Review System

* [ ] Post-match review prompt for all participants
* [ ] Player → Player anonymous text reviews
* [ ] Anonymous review acknowledgment warning
* [ ] Que Master text notes (non-anonymous)
* [ ] Umpire optional skill rating
* [ ] Profanity filter on text submissions
* [ ] Review moderation (Club Owner flag dismissal)
* [ ] Match completion logic updated: umpire score + reviews or finalization

#### Player Statistics (Full)

* [ ] Wins, Losses, Win rate (shown after 5 scored matches)
* [ ] Sessions attended, Clubs joined
* [ ] Average skill rating display
* [ ] Rating trend (ascending / stable / descending)
* [ ] Advanced stats (after 20 matches): frequent partner, frequent opponent, best partner, toughest opponent, peak rating

#### Gamification

* [ ] EXP earning system (all actions in EXP table)
* [ ] EXP transaction log per player
* [ ] Ranking tier calculation and display (6 tiers)
* [ ] Tier badge on profile, player pool, and leaderboard
* [ ] EXP reversal on match void

#### Club Leaderboard

* [ ] Cumulative club leaderboard (all-time)
* [ ] Time range filters: All / Last 30 days / Last 90 days
* [ ] Skill rating column on club leaderboard

#### Notifications (Full)

* [ ] In-session notifications: umpire assignment, smart monitoring alert, match complete
* [ ] Post-session: leaderboard published, review window closing, EXP awarded
* [ ] Club events: join approved/rejected, Que Master role changes
* [ ] Review reminders (2-hour warning before window closes)

#### Sharing

* [ ] Player profile share (link + OG card)
* [ ] Match result share (image card)
* [ ] Session leaderboard share (live link + image snapshot)
* [ ] Club leaderboard share (live link)
* [ ] Club invite QR share card

#### Gear Showcase

* [ ] Racket entries (brand, model, balance, string setup, grip, links)
* [ ] Shoe entries (brand, size, fit, links)
* [ ] Bag entries (brand, size, links)
* [ ] Profile completion EXP bonus

---

## Phase 3 — Tournaments & Platform Growth

**Goal**: Expand to structured competition, open the platform to new clubs, and enable Admin management.

**Definition of Done for Phase 3**: A tournament can be run end-to-end through the app. The Admin role exists and can approve Club Owners. Players can configure notification preferences. Payment integrations are live for at least one provider.

### Features

#### Tournament Module

* [ ] Tournament creation (Club Owner / Tournament Admin)
* [ ] Bracket types: single elimination, double elimination, round robin
* [ ] Skill-tier registration restrictions
* [ ] Doubles pair registration
* [ ] Tournament scheduling
* [ ] Tournament-specific leaderboard
* [ ] EXP multiplier by round
* [ ] Tournament winner bonus EXP

#### Admin Role

* [ ] Admin account creation (manual, system-level)
* [ ] Club Owner application review interface
* [ ] Platform-wide moderation tools (flag removal, account suspension)
* [ ] Global leaderboard curation
* [ ] Gamification config: EXP rates, tier thresholds, badge criteria

#### Global Leaderboard

* [ ] Platform-wide rankings (min 20 scored matches to appear)
* [ ] Public Explore page (accessible without login)
* [ ] Region and level filters

#### Badge System

* [ ] Badge definitions and triggers (full list from `14_gamification.md`)
* [ ] Badge collection on player profile
* [ ] Locked badge display with unlock condition

#### Payment Integrations

* [ ] GCash integration (Philippines)
* [ ] PayMaya / Maya integration (Philippines)
* [ ] Auto-payment confirmation for Que Master

#### Notification Preferences

* [ ] Per-player notification settings (session reminders, in-session, club events, review reminders, EXP updates)

#### Other

* [ ] Reporting system for flagged reviews
* [ ] Player-to-player search and discovery
* [ ] Club discovery (public clubs, Explore page)
* [ ] Match history filters (by club, time range, result, opponent)
* [ ] PDF / exportable session cost summary
