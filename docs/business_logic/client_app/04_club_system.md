# 04 — Club System

## Overview

Clubs are the **primary organizational unit** of the app. Every queue session, leaderboard, and membership exists under a club. A player can belong to multiple clubs. A club is **minted** only after an admin-approved **`club_applications`** row sets that player as `clubs.owner_id` (see [`../../database/12_club_governance.md`](../../database/12_club_governance.md)).

---

## 4.0 Club creation, demotion, and complaints

### Creating a club

1. Player submits **`club_applications`** from the Client app (`/clubs/apply`) with full venue and verification-oriented fields.
2. Admin reviews in **Admin app** → Approve inserts **`clubs`** + links `resulting_club_id`; Reject sends `club_application_rejected` with a **required rejection reason code** and optional note.
3. **Defaults on minted club:** `auto_approve = true`, `invite_link_enabled = true`, invite token generated (see database doc 12). *Product note: `auto_approve` default may later flip to `false` if join approval should start closed.*
4. **SLA:** if a pending application is not decided within **24 hours** of `updated_at`, it is auto-rejected; each applicant edit resets the window.

### Duplicate names and discovery

* **Club names may duplicate** globally; the canonical identifier is **`clubs.id`**.
* Discovery and profile UIs should show **city / location** (and owner when helpful) as a subtitle so players can tell clubs apart.

### Demotion, transfer, and closure

* **Per club:** demotion, transfer, or voluntary step-down affects **one club** at a time.
* **Archive, never hard-delete:** closed clubs use `status = archived`; history remains queryable.
* When a club is closed or archived after demotion, **all members** receive a **`club_closed`** notification.
* **Ownership transfer:** former owner remains an **active member** with role `member`; new owner is set on `clubs.owner_id` and `club_members.role = owner`.

### Member complaints to admins

* Members file **`complaints`** (separate from automated **`moderation_flags`**) from club profile, player profile, session, etc. Only **members of the relevant club** may file (enforced in app logic).
* Admins triage duplicates; complainants do **not** receive resolution notifications.
* Escalation creates a **`club_demotion_requests`** row linked from the complaint when appropriate.

---

## 4.1 Core Concepts

* **Club queue** sessions are scoped to a club; **player-organized** Quick Sessions may be **clubless** (casual, no club)
* **Competitive progression** (**EXP**, **MMR**, **ranked** match credit) is available **only** through **club queue** sessions created by a **Que Master** or **Club Owner**, and **only** when **Schedule type** is **MMR (competitive)** (`08_queue_session.md`, `14_gamification.md`). **Player-organized** sessions and **Fun Games** club schedules are social and recorded (standings, history, skill-dimension reviews) but do **not** award EXP or move MMR.
* Que Masters are assigned per club and have no authority outside that club
* Leaderboards and statistics are tracked at the club level (and eventually globally)
* A player's club membership does not expire — it persists until they leave or are removed

---

## 4.2 Club States

| State    | Description | Sessions | Join Requests |
|----------|-------------|----------|---------------|
| Active   | Fully operational | Allowed | Allowed |
| Paused   | Temporarily suspended | Blocked | Blocked |
| Archived | Read-only historical record | Blocked | Blocked |

* Club Owners can change a club's state between **active** and **paused**; **archived** is also used when admins or demotion flows close a club (see §4.0).
* Archived clubs retain all historical data (sessions, match history, leaderboards)
* A Paused club can be reactivated to Active at any time
* Archiving is intended to be permanent; there is no unarchive flow in MVP. Clubs are **not hard-deleted**.

---

## 4.3 Club Profile

Each club has a public profile visible to all players (members and non-members):

| Field | Description |
|-------|-------------|
| Club name | Required; **may duplicate** other clubs (disambiguate by location / id in UI) |
| Description | Short bio (also captured on application; may be refined after creation) |
| Location | **City / venue** shown on cards and profiles for disambiguation (free text in MVP) |
| Member count | Public, shown on profile |
| Founded date | System-generated |
| Club Owner | Shown publicly |
| Visibility | Public (discoverable) or Private (invite/link only) |

---

## 4.4 Joining a Club

Players can join a club through three distinct methods. The outcome of each depends on the club's **Auto-Approve** setting.

---

### Method 1: Invite Link / QR Code

* The Club Owner generates one active invite link per club at a time
* The link can be shared freely (group chat, social media, printed QR)
* QR code is a scannable visual encoding of the same link
* The Club Owner can:
  * Enable or disable the link at any time (disabled link shows an error to anyone who follows it)
  * Rotate the link (old link immediately invalidated, new one generated)

**On following the link:**

| Auto-Approve Setting | Result |
|---------------------|--------|
| ON | Player is immediately added as an Active Member |
| OFF | A pending join request is created for Club Owner review |

---

### Method 2: Direct Invite

* Club Owner searches for a player by name or profile and sends a direct invite
* Player receives an in-app notification: "Club X has invited you to join"
* Player can accept or decline
* Direct invites **bypass** the Auto-Approve setting — they are always immediately accepted on acceptance
* Declined invites can be re-sent by the Club Owner

---

### Method 3: Request to Join

* Player discovers the club via search or a shared profile and taps "Request to Join"
* The request includes the player's profile (name, level, photo)

| Auto-Approve Setting | Result |
|---------------------|--------|
| ON | Request is auto-accepted; player becomes an Active Member immediately |
| OFF | Request enters a pending queue visible to the Club Owner |

* Club Owner can approve or reject with an optional note to the player
* Player is notified either way

---

## 4.5 Member Lifecycle

```
Invited / Requested
       ↓
  Pending Review  ←── (only if auto-approve is OFF)
       ↓
    Active Member
       ↓
  Left / Removed
```

### State Details

| State | Triggered By | Notes |
|-------|-------------|-------|
| Pending | Player request or link follow (auto-approve OFF) | Club Owner must act |
| Active | Approval, auto-approve, or direct invite acceptance | Full member |
| Left | Player taps "Leave Club" | Voluntary; can rejoin |
| Removed | Club Owner removes member | Can re-request unless blocked |
| Blocked | Club Owner blocks after removal | Cannot re-request or follow links |

---

## 4.6 Club Owner Controls

### Membership Settings

| Setting | Options | Default | Effect |
|---------|---------|---------|--------|
| Auto Approve | ON / OFF | OFF | Controls whether join requests are approved automatically |
| Invite Link | ON / OFF | ON | Controls whether the invite link is active |

### Join Request Management

* View all pending join requests in a list (oldest first)
* Each request shows: player name, photo, playing level, date requested
* Actions: **Approve** or **Reject** (with optional note)
* Bulk actions: approve all, reject all (future)

### Member Management

* View all active members with their role (Player / Que Master)
* Remove any member (cannot remove themselves or other Club Owners)
* View a **membership action log**: who was added, removed, approved, rejected, and when
* Future: block a removed player from rejoining

---

## 4.7 Que Master Assignment

The Club Owner can assign **any number of active club members** as Que Masters. There is no cap. This allows multiple Que Masters to co-manage sessions simultaneously.

| Rule | Detail |
|------|--------|
| Who assigns | Only the Club Owner |
| Eligibility | Must be an Active Member of the club at time of assignment |
| Scope | Per-club only; no cross-club authority |
| Limit | No maximum — a club can have as many Que Masters as the owner chooses |
| Assignment method | Club Owner selects one or more members from the member list and grants Que Master role |
| Bulk assignment | Club Owner can assign multiple members to Que Master in a single action |
| Revocation | Club Owner can revoke one or all Que Master assignments at any time |
| Multi-club | The same player can be Que Master in multiple clubs simultaneously |

When a Que Master is assigned, they receive an in-app notification.
When revoked, they lose session management access immediately. Any in-progress session actions they were performing are preserved (server state is not rolled back).

---

## 4.8 Club Owner Statistics View

The Club Owner has access to a dedicated **Statistics tab** within the club management panel. This view provides membership and financial insights across all sessions under the club.

---

### 4.8.1 Membership Analytics

#### New Members

* Count of members who joined the club within a selected time range
* Time range options: Last 7 days / Last 30 days / Last 90 days / Custom
* Displays as a count + a simple trend chart (bar or line)
* Drilldown: tap the count to see the list of new members with their join date and method

#### Consistent Members

* Count of members who meet the **consistency threshold**: attended ≥ 3 sessions in the last 30 days (configurable by Club Owner)
* Displayed with a percentage of total active members (e.g. "12 of 40 members are consistent")
* Club Owner can adjust the threshold (minimum sessions in a rolling period)
* Drilldown: tap the count to see a ranked list of consistent members (most sessions first)

| Field in drilldown | Description |
|--------------------|-------------|
| Player name + photo | Identity |
| Sessions attended | Count in the selected period |
| Last session date | Most recent attendance |
| Streak | Consecutive sessions attended (if applicable) |

#### Members Invited via Invitation Code

* Count of members who joined specifically via the **Invite Link / QR Code** method
* Tracked per invite link generation (so the Club Owner can see how many came from the current link vs. previous ones)
* Breakdown:
  * Total via link (all time)
  * Via current active link
  * Via each previous link (with link rotation date shown)
* Drilldown: list of players who joined via link, with join date

---

### 4.8.2 Financial Analytics

#### Spending Per Queue Schedule (Session)

* A list of all sessions with their associated costs:

| Column | Description |
|--------|-------------|
| Session date | When the session was held |
| Venue | Location name |
| Court cost | Total court rental paid |
| Shuttle cost | Shuttles used × cost per tube |
| Total cost | court_cost + shuttle_cost |
| Markup collected | Total markup added to player fees |
| Players | Accepted player count |
| Per-player fee | Calculated fee charged to each player |
| Collected | Sum of confirmed payments |
| Outstanding | Unpaid + partial amounts remaining |

* Sortable by date (default: newest first), total cost, or outstanding amount
* Tap a session row to view its full payment breakdown per player

#### Aggregate Financial Summary

Configurable time range with the following financial totals:

| Range Option | Description |
|-------------|-------------|
| Per session | Individual session costs (see above) |
| Last 7 days | Rolling 7-day window |
| Last 30 days | Rolling 30-day window |
| Last 90 days | Rolling 90-day window |
| This month | Calendar month (1st to today) |
| Last month | Previous full calendar month |
| Last 3 months | 3 calendar months |
| Last 6 months | 6 calendar months |
| This year | Jan 1 to today |
| All time | Since club was created |
| Custom range | Club Owner picks start and end date |

For each range, the summary shows:

| Metric | Description |
|--------|-------------|
| Total spent | Sum of all court + shuttle costs across sessions in the range |
| Total collected | Sum of all confirmed player payments |
| Total markup | Sum of all markup amounts collected |
| Markup as "profit" | Total markup collected (this is the organizer's margin above actual cost) |
| Outstanding | Total unpaid/partial amounts still owed |
| Sessions held | Count of completed sessions |
| Average cost per session | Total spent ÷ sessions held |
| Average cost per player | Total spent ÷ total player-session attendances |

> **"Profit" definition**: Profit in this context is the markup collected above the actual court and shuttle cost. The app does not assume the Club Owner is running a business — markup is optional. If no markup is set, profit is 0 for that session.

---

### 4.8.3 Statistics View Layout

The Statistics tab is structured as:

```
[ Membership ]  [ Financials ]   ← sub-tabs or sections

Membership:
  ┌─────────────────────────────────┐
  │  New Members     [12]  Last 30d │
  │  Consistent      [8]   ≥3 sess  │
  │  Via Invite Link [5]   All time │
  └─────────────────────────────────┘
  [View Blacklist →]

Financials:
  [ Time range selector ]
  ┌──────────────────────────────────┐
  │  Total Spent      ₱ 4,200        │
  │  Total Collected  ₱ 3,800        │
  │  Outstanding      ₱ 400          │
  │  Markup Profit    ₱ 600          │
  │  Sessions         7              │
  └──────────────────────────────────┘
  [ Per-Session Breakdown list ]
```

---

## 4.9 Player Blacklist

The Blacklist is a Club Owner tool to permanently prevent specific players from accessing the club. It is more restrictive than simple removal and is intended for repeat offenders, bad actors, or players the Club Owner has decided should never be re-admitted.

---

### 4.9.1 What Blacklisting Does

A blacklisted player is **silently blocked** at all entry points:

| Entry point | Behavior for blacklisted player |
|-------------|--------------------------------|
| Following the club invite link | Receives generic error: "This invite is no longer valid." |
| Submitting a join request | Request is silently rejected; player sees: "Your request could not be processed." |
| Receiving a direct invite | Club Owner cannot send a direct invite to a blacklisted player (invite option is greyed out) |
| Being added to a session | Cannot be added to any session under this club |

The player is **not told they are blacklisted** — they receive generic error messages. This prevents retaliation or confrontation.

---

### 4.9.2 How to Blacklist a Player

Club Owner can blacklist a player from two places:

1. **Member Management tab** → tap a current or former member → "Blacklist Player"
2. **Statistics view → Blacklist tab** → "Add to Blacklist" → search for player by name

Both flows require the Club Owner to confirm the action with an optional internal note (note is visible only to the Club Owner — not the player).

---

### 4.9.3 Blacklist vs. Removed

| State | Can Rejoin? | Can Follow Invite Link? | Can Request to Join? |
|-------|------------|------------------------|---------------------|
| Removed | Yes (by default) | Yes (if link is active) | Yes |
| Removed + Blocked | No | No | No (request rejected) |
| Blacklisted | No | No (silent error) | No (silently rejected) |

> **Blocked** (set after removal in the member management flow) and **Blacklisted** behave identically from the player's perspective but are tracked separately. Blacklist is more permanent and is the Club Owner's explicit long-term ban tool.

---

### 4.9.4 Blacklist Management (Club Owner View)

The Blacklist is accessible from:
* Statistics tab → Membership section → "View Blacklist" button
* Club Settings → Member Management → "Blacklisted" filter tab

#### Blacklist Entry Fields

| Field | Description |
|-------|-------------|
| Player name + photo | Who is blacklisted |
| Blacklisted on | Date the blacklist was applied |
| Blacklisted by | Which Club Owner applied it (relevant for future multi-owner clubs) |
| Reason / note | Internal note (optional, visible to Club Owner only) |
| Previous role | What role they had before (Player, Que Master) |
| Actions | Remove from blacklist |

#### Removing from Blacklist

* Club Owner can remove a player from the blacklist at any time
* Removing from the blacklist does **not** re-add them to the club — they must go through the normal join flow again
* Removing from the blacklist is logged in the membership action log

---

### 4.9.5 Blacklist Rules

* A player can be blacklisted even if they are not currently a member (e.g. a player who was removed and is trying to rejoin)
* A player who is currently an Active Member must be **removed first, then blacklisted** — they cannot be blacklisted while still an active member
* If a Que Master is blacklisted, their Que Master role is revoked immediately at the time of removal
* Blacklist is per-club — being blacklisted in Club A has no effect on Club B

---

## 4.10 Club Discovery (Future)

* Public clubs are searchable by name
* Private clubs are not discoverable — only joinable via link/QR or direct invite
* Featured clubs (platform-promoted) shown on explore page (Admin-managed)
