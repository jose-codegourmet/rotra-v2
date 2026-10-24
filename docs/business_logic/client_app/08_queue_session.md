# 08 — Que Sessions (Canonical Feature Specification)

> **Canonical document.** This is the single source of truth for the ROTRA Que Sessions module. All related business-logic, database, and view documents must link here and must not contradict it.
>
> **Terminology:** See [`../00_ubiquitous_language.md`](../00_ubiquitous_language.md). Use **Que** for ROTRA session terminology; use **Queue** only for **Match Queue** or **Session waitlist** behavior.
>
> **Related docs:** [`09_cost_system.md`](./09_cost_system.md) · [`15_notifications.md`](./15_notifications.md) · [`18_canonical_rules.md`](./18_canonical_rules.md) · [`automatic_queueing.md`](./automatic_queueing.md) · [`../../database/03_queue_sessions.md`](../../database/03_queue_sessions.md) · [`../../database/04_matches.md`](../../database/04_matches.md)

---

## Table of contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Terminology](#2-terminology)
3. [Roles & Permissions](#3-roles--permissions)
4. [Session Classification](#4-session-classification)
5. [Session Lifecycle](#5-session-lifecycle)
6. [Admission States](#6-admission-states)
7. [Attendance & In-Session States](#7-attendance--in-session-states)
8. [The Lobby](#8-the-lobby)
9. [Lobby Information](#9-lobby-information)
10. [Password Protection](#10-password-protection)
11. [Joining & Approval](#11-joining--approval)
12. [Session Waitlist](#12-session-waitlist)
13. [Skill Eligibility](#13-skill-eligibility)
14. [Cancellation Policy](#14-cancellation-policy)
15. [No-Show Behavior](#15-no-show-behavior)
16. [Active Session — Accepted but Not Arrived](#16-active-session--accepted-but-not-arrived)
17. [Active Session — Arrived Player](#17-active-session--arrived-player)
18. [Request a Match](#18-request-a-match)
19. [Session Host Interface](#19-session-host-interface)
20. [Players Management](#20-players-management)
21. [Financials](#21-financials)
22. [Collections](#22-collections)
23. [Shuttle Information](#23-shuttle-information)
24. [Session Settings](#24-session-settings)
25. [Privacy & Visibility](#25-privacy--visibility)
26. [Session Feed](#26-session-feed)
27. [Notifications](#27-notifications)
28. [Realtime Behavior](#28-realtime-behavior)
29. [State Matrix](#29-state-matrix)
30. [Permission Matrix](#30-permission-matrix)
31. [Transition Tables](#31-transition-tables)
32. [Validation Rules](#32-validation-rules)
33. [Edge Cases](#33-edge-cases)
34. [Completed Session History](#34-completed-session-history)
35. [Data-Model Responsibilities](#35-data-model-responsibilities)
36. [API & Backend Responsibilities](#36-api--backend-responsibilities)
37. [Deferred Decisions](#37-deferred-decisions)
38. [Cross-Document References & Deliverables](#38-cross-document-references--deliverables)

---

## 1. Purpose & Scope

A **Que Session** is the core operational unit of ROTRA: a bounded, time-limited badminton event with admitted players, courts, a Match Queue, live scoring, payments, and realtime sync.

This document specifies the **entire Que Sessions feature** from creation through completion:

- Business rules, roles, lifecycle, admission, attendance, Lobby, password protection, waitlist, skill eligibility, cancellation, match requests, host controls, payments, shuttles, Feed, notifications, realtime, validation, state transitions, edge cases, and read-only history.

**In scope:** Club Que Sessions, Friendly Que Sessions, discovery, Lobby, host console, player views, data-model responsibilities, API responsibilities.

**Out of scope (documented as TBD or non-goals):** Cost-estimation formulas, payment gateway integration, shuttle inventory carryover, waitlist-swap automation details, historical correction workflows not yet canonical.

---

## 2. Terminology

| Term | Definition |
| ---- | ---------- |
| **Que Session** | Umbrella term for any ROTRA session (`queue_sessions` row). Synonym: **Que Schedule**. |
| **Club Que Session** | Session origin: created under a club; Session type = MMR or Fun Games. |
| **Friendly Que Session** | Session origin: informal; Session type = Regular (implicit). |
| **Session type** | Competitive mode for Club Que Sessions only: **MMR** or **Fun Games**. |
| **Lobby** | Main Player-facing Que Session detail view; becomes **Overview** tab when Active. |
| **Match Queue** | Ordered list of upcoming matches inside an Active Que Session. |
| **Session waitlist** | Over-capacity admission queue (FIFO). Not the marketing waitlist. |
| **Session Feed** | Per-session activity stream of changes and announcements. |
| **Admission state** | Whether a player is registered and in what capacity. |
| **Attendance state** | Player's live in-session status (I Am In, Playing, etc.). |
| **Request a Match** | Player proposal for a lineup; requires Que Master approval. |
| **Early Exit** | Required leave workflow after I Am In. |
| **Voided** | Terminal match outcome; never use **Unscored**. |

---

## 3. Roles & Permissions

### 3.1 Who may create a Que Session

Only:

- **Club Owner**
- **Que Master**

A regular **Player** cannot create a Que Session.

### 3.2 Session management

Every Que Session must remain manageable by:

- The **Club Owner**, and/or
- At least one **assigned Que Master**

There is no required "primary Que Master." All assigned Que Masters on the same session have **identical** session-management permissions.

The **Club Owner** always retains full management access.

### 3.3 Que Master assignment (Club Owner only)

Only the **Club Owner** may:

- Add a Que Master to the session
- Remove a Que Master from the session
- Replace an assigned Que Master

One Que Master **cannot** remove another Que Master.

The Club Owner may add, remove, or replace Que Masters **while the Que Session is Active**.

### 3.4 Enrolled vs in-session (dashboard)

Creating or joining a Que Session creates a **registration** (enrollment). Enrollment alone does **not** mean the user is "in session" for dashboard indicators (Active Session Banner, LIVE navbar strip, `resume` Quick Session button).

| Concept | Meaning |
| ------- | ------- |
| **Enrolled** | `session_registrations` row exists with qualifying `admission_status` and `player_status` ≠ `exited` |
| **In session (current)** | Enrolled **and** either DB status is `active`, or DB status is `open` with `dateTime <= now` |

**Quick Session / host creation:** Publishing a Friendly Que Session sets status `open` and enrolls the creator as `accepted` / `not_arrived`. If `dateTime` is in the future, the host is **enrolled** but **not in session** until:

1. The host taps **Start Session** in the Que Master Console (DB → `active`), **or**
2. `dateTime` passes while the session remains `open`

Until then, dashboard UI shows the **scheduled** Quick Session affordance — not `ACTIVE SESSION` / `RESUME SESSION` or LIVE indicators.

See [`../../views/client_app/common/session_discovery_dashboard.md`](../../views/client_app/common/session_discovery_dashboard.md) § Active-Session Guard — Date/Time Gate.

### 3.5 Player permissions

Players may join, view according to privacy rules, mark I Am In / I Am Prepared, submit **Request a Match**, and use **Early Exit**. They **cannot**:

- Reorder the Match Queue
- Insert matches into queue positions
- Change another player's status, scores, payments, or settings
- Receive Que Master permissions

---

## 4. Session Classification

Three concepts must remain **separate** — never collapse into one field.

### 4.1 Session origin

| Origin | Created by | Notes |
| ------ | ---------- | ----- |
| **Club Que Session** | Club Owner or Que Master | Club-scoped; Session type required |
| **Friendly Que Session** | Club Owner or Que Master | Always Regular; no EXP/MMR |

### 4.2 Session type

| Session type | Applies to | EXP / MMR |
| ------------ | ---------- | --------- |
| **Club Que Session — MMR** | Club origin only | Yes |
| **Club Que Session — Fun Games** | Club origin only | No |
| **Friendly Que Session — Regular** | Friendly origin only | No |

Do not use the vague label "Ranked or Regular Match" when a canonical session type can be shown.

**Session type cannot be changed** after the session becomes **Active**, or after any match has started.

### 4.3 Schedule context (timing classification)

| Value | Meaning |
| ----- | ------- |
| **Regular club schedule** | Recurring or planned club programming |
| **Quick session** | One-time or ad-hoc session |

Separate from origin and session type. Used for display and organization.

### 4.4 Competitive scope summary

| Outcome | Friendly — Regular | Club — Fun Games | Club — MMR |
| ------- | ------------------ | ---------------- | ---------- |
| Match record & score | Yes | Yes | Yes |
| Skill dimension ratings | Yes | Yes | Yes |
| EXP / MMR | No | No | Yes |

See [`06_skill_rating.md`](./06_skill_rating.md) and [`14_gamification.md`](./14_gamification.md).

---

## 5. Session Lifecycle

```text
Draft → Open → Active → Closed → Completed
  ↓       ↓
Cancelled (terminal)
```

| State | Definition | Who acts | Players can join? |
| ----- | ---------- | -------- | ----------------- |
| **Draft** | Being configured; not visible for join | Club Owner, assigned Que Masters | No |
| **Open** | Published; accepts join requests / admissions / waitlist | Hosts + Players | Yes |
| **Active** | Session operating; matches, attendance, requests | Hosts + Players + Umpires | Per admission rules |
| **Closed** | Playing ended; payments/collections may be outstanding | Hosts (settlement) | No |
| **Completed** | Terminal; all required payments settled | Read-only | No |
| **Cancelled** | Terminal; session will not proceed | Host cancels | No |

### 5.1 State details

**Draft** — Not available to Players. Host configures settings.

**Open** — Discovery-eligible per visibility rules. Join, waitlist, and approval flows active.

**Active** — I Am In, I Am Prepared, Match Queue, Request a Match, live scores, Feed active.

**Closed** — No new matches. Host settles payments and collections.

**Completed** — Terminal. **All** of the following must be true before transition:

1. Playing has ended
2. Everyone financially obligated is marked **Paid**
3. No unresolved required collections

After **Completed**:

- Cannot reopen
- Scores, attendance, payments, configuration, match records are **permanently read-only**

**Cancelled** — Terminal. Refunds/credits handled **manually outside ROTRA**. ROTRA may display recorded payment info but does not process refunds automatically.

### 5.2 Cancellation transitions

| From | To | Actor | Notes |
| ---- | -- | ----- | ----- |
| Draft | Cancelled | Club Owner or Que Master | — |
| Open | Cancelled | Club Owner or Que Master | Notify affected players |
| Active | Cancelled | Club Owner or Que Master | Unusual; recorded in Feed |

`Cancelled` is not reachable from `Closed` or `Completed`.

### 5.3 Discovery visibility

| Session `status` | On discovery map/list? |
| ---------------- | ---------------------- |
| `open`, `active` | Yes (per visibility + coordinates) |
| `draft`, `closed`, `completed`, `cancelled` | No |

See [`../../views/client_app/common/session_discovery_dashboard.md`](../../views/client_app/common/session_discovery_dashboard.md).

### 5.4 Active session guard

A player registered (`admission_status` in `accepted`, `waitlisted`, `pending_approval`, or `reserved`; `player_status` not `exited`) in a session with `status` `open` or `active` **cannot** join a different session without leaving the current one first.

This guard applies to **all enrollments** — including future `open` sessions where `dateTime > now` (scheduled).

### 5.5 Dashboard "current session" gate

Separate from §5.4: dashboard **current-session** indicators (Active Session Banner, `resume` Quick Session button, LIVE navbar/sidebar strip) apply only when the enrollment is **current** per §3.4 — not merely enrolled.

| Enrollment timing | Join guard (§5.4) | Dashboard "in session" UI |
| ----------------- | ----------------- | ------------------------- |
| Future `open` (`dateTime > now`) | Yes — cannot join another | No — show `scheduled` affordance only |
| Past `open` or DB `active` | Yes | Yes — banner + `resume` + LIVE strip |

---

## 6. Admission States

Admission is **separate** from attendance.

| State | Meaning | Occupies slot? |
| ----- | ------- | -------------- |
| **Not Registered** | No registration for this player | No |
| **Pending Approval** | Join request awaiting host decision | **No** |
| **Accepted** | Confirmed seat within capacity | **Yes** |
| **Waitlisted** | Over capacity; FIFO queue | No |
| **Declined** | Request rejected | No |
| **Withdrawn** | Player withdrew pending request | No |
| **Cancelled Registration** | Player cancelled accepted registration | No (slot released) |
| **Removed** | Host removed player | No |
| **Reserved** | Host-held slot for specific player | Yes |

Pending requests **do not** occupy slots. A slot is occupied only when the player is **Accepted** (or **Reserved**).

---

## 7. Attendance & In-Session States

Attendance is **separate** from admission.

| State | Set by | Meaning | Rotation-eligible? |
| ----- | ------ | ------- | ------------------ |
| **Not Arrived** | System (default) | Accepted but not at venue | No |
| **I Am In** | Player (irreversible) | Arrived at venue | No |
| **I Am Prepared** | Player or host | Ready for Match Queue | Yes |
| **Waiting** | System | Queued for next match | Yes |
| **Playing** | System | In active match | No |
| **Resting** | Player or host | Break | Host discretion |
| **Eating** | Player or host | Meal break | No |
| **Suspended** | Host only | Removed from rotation | No |
| **Exited** | Player (Early Exit) or host | Left session | No |

Do **not** use one generic `attended` value for these conditions.

### 7.1 I Am In

Before applying:

1. Show confirmation modal
2. Explain action **cannot be undone** by the Player
3. Require explicit confirmation

The Player **cannot** undo I Am In. Corrections require an authorized Que Master or Club Owner per audit rules.

### 7.2 I Am Prepared

After I Am In, Player may mark I Am Prepared to indicate readiness for rotation and Match Queue eligibility.

### 7.3 Early Exit

Once I Am In, leaving uses **Early Exit** — not registration cancellation.

Early Exit:

1. Player or host initiates
2. Host confirms payment obligation per [`09_cost_system.md`](./09_cost_system.md)
3. Host confirms exit
4. `player_status` → **Exited**; password authorization revoked if protected
5. Slot may open; waitlist promotion per §12

Exited players cannot re-enter. Retain read-only session access where applicable.

---

## 8. The Lobby

The **Lobby** is the main Player-facing Que Session detail view **before** the session starts.

When the session becomes **Active**, the Lobby remains available as the **Overview** tab.

The Lobby adapts according to:

- Session lifecycle
- Admission state
- Attendance state
- User role
- Session privacy
- Password authorization
- Identity-visibility settings

**Route:** `/sessions/:id` (Player view). Host management: `/sessions/:id/manage`.

---

## 9. Lobby Information

### 9.1 Session identity

Display when authorized:

- Session title, description, club name, venue, address
- Date, start time, expected end time, duration (hours and minutes)
- Countdown until start (or **Live** state when Active)
- Lifecycle status, session origin, session type, schedule context
- Match format, score limit (when applicable)

**Countdown behavior:**

| Lifecycle | Display |
| --------- | ------- |
| Future | Countdown to start |
| Starting soon | Countdown (urgent styling) |
| Active | **Live** — replace countdown |
| Closed | Session ended / settling |
| Completed | Completed (read-only) |
| Cancelled | Cancelled |

No estimation formula is required for countdown.

### 9.2 Session management team

Show **Club Owner** and **assigned Que Masters** only. Do not list every Que Master in the club unless assigned to this session.

### 9.3 Capacity summary

Aggregate display only — e.g. `12 / 16 slots occupied`:

- Total slots, occupied, available
- Accepted count, pending request count, waitlist count
- Arrived count (when relevant)

**Do not** show individual slot rows (Slot 1 — Occupied, etc.).

Pending requests do not count as occupied. Accepted players occupy slots even if Not Arrived.

### 9.4 Player identities in the Lobby

Configurable per session (**Lobby identity visibility**). Allowed audiences:

- Club Owner and Que Masters only
- Accepted and Waitlisted Players
- All users with authorized Lobby access

Aggregate slot counts remain visible when identities are hidden.

**After Active:**

- Accepted Players may see participant identities
- Waitlisted Players see identities only when waitlisted live-viewing allows
- Public viewers see identities on active courts only when public live viewing is enabled

### 9.5 Session resources (display only)

- Number of courts, scheduled hours
- **Estimated games per player** — when courts, duration, and total player slots are known
- Estimated total matches and wait time — **when available** (wait time: see §37)

**Visibility:** All users with authorized Lobby access (not host-only). Shown in the Lobby (Open), Overview tab (Active), Session Setup, and Quick Session Sheet.

**Purpose:** Informational planning aid only. Does **not** set Automatic Queueing targets, minimum games guarantees, or queue-priority rules.

#### Games per player estimation

**Inputs:**

| Input | Source |
| ----- | ------ |
| `numCourts` | Session setting |
| `playersPerCourt` | Session setting (2 singles / 4 doubles) |
| `durationHours` | Scheduled session length (start → end), or remaining duration when Active |
| `totalPlayers` | Total admitted player slots (`totalSlots` on full Session Setup; `numCourts × playersPerCourt` on Quick Session Sheet) |

**Formula:**

```text
totalGameSlots   = numCourts × floor((durationHours × 60) / avgGameMins)
totalPlayerSlots = totalGameSlots × playersPerCourt
estimatedGames   = floor(totalPlayerSlots / totalPlayers)
```

**Average game duration** (recommended defaults — not hard limits):

| Estimate | `avgGameMins` | Meaning |
| -------- | ------------- | ------- |
| Pessimistic | 30 | Slow / long games |
| Typical | 15 | Average |
| Optimistic | 10 | Fast games |

**Display format:** range using pessimistic–optimistic bounds, with typical as secondary label.

- Example: `4–12 games per player` with `~8 typical`
- Example (rotation — more players than on-court slots): `2–6 games per player` with `~4 typical`

**When Active:** recalculate using **remaining** scheduled duration (end time minus current time), not original full duration.

**When hidden:** omit if `numCourts`, `durationHours`, or `totalPlayers` is missing or zero.

**Example reference:**

| Courts | Format | Duration | Total players | Pessimistic | Typical | Optimistic |
| ------ | ------ | -------- | ------------- | ----------- | ------- | ---------- |
| 2 | Doubles | 2h | 8 | 4 | 8 | 12 |
| 2 | Doubles | 2h | 16 | 2 | 4 | 6 |
| 3 | Singles | 2h | 6 | 4 | 8 | 12 |
| 1 | Doubles | 1.5h | 4 | 3 | 6 | 9 |

See [`../../views/client_app/common/quick_session_sheet.md`](../../views/client_app/common/quick_session_sheet.md), [`../../views/client_app/club_owner/session_setup.md`](../../views/client_app/club_owner/session_setup.md), [`../../views/client_app/player/player_session_view.md`](../../views/client_app/player/player_session_view.md).

### 9.6 Shuttle information

Multiple shuttle entries per session. Each entry may include:

- Brand, type (when tracked), planned tubes, consumed tubes (Active), cost per tube, total cost (when supported)

Example: Brand A — 2 tubes; Brand B — 1 tube.

Hosts may add/edit entries and update consumed quantities while Active. ROTRA does not track which person opened a tube. Unused-tube carryover: **out of scope**.

### 9.7 Shuttle-cost visibility

| Audience | Sees shuttle cost? |
| -------- | ------------------ |
| Players | Only when setting enabled (**default: Off**) |
| Club Owner, Que Masters | Always |

Players always see brand and quantity when shuttles are shown.

### 9.8 Payment information

Show when authorized:

- Estimated fee per player, final amount owed (when available)
- **Current player's own** payment status only
- Accepted payment methods (Cash, E-wallet)
- Rich-text payment instructions

ROTRA does not process e-wallet payments. Players are **not** required to upload receipts or enter transaction references. Hosts track and confirm payments. Players **must not** see other players' payment records.

---

## 10. Password Protection

A Que Session may protect Lobby details with a **password** (for invited users).

### 10.1 Expected flow

1. Host invites user with link + password
2. User opens invitation link
3. User sees limited information
4. User enters password
5. User receives full protected Lobby access

Password does **not** auto-approve join. User may still need to request join, wait for approval, or join waitlist.

### 10.2 Visible before password

Only: session title, session date, club name.

**Not shown:** venue, full description, Que Masters, roster, payment instructions, shuttles, active session info, private Feed entries.

### 10.3 Invitation method

Password-protected sessions are shared via **invitation link**. QR/public session-code not required unless defined elsewhere.

### 10.4 Authorization persistence

After correct password:

- Authorization remembered per user per session
- Persists across browsers/devices (server-side)
- Navigating away does not revoke

**Revoked when:** registration cancelled, request withdrawn, Early Exit.

Already-authorized users retain access if password changes; new/unauthorized users need updated password.

### 10.5 Incorrect password attempts

- First failure: normal retry
- After first failure: **one attempt per 5 minutes**; each failure resets cooldown
- Refresh must not bypass; **backend-enforced**
- UI: incorrect message, time remaining, disabled submit during cooldown

Passwords: never plaintext; secure hashing; never in logs, API responses, or Feed.

---

## 11. Joining & Approval

Each Que Session has an **admission policy**:

| Mode | Behavior |
| ---- | -------- |
| **Automatic admission** | Eligible player → Accepted if slot available; Waitlisted if full |
| **Approval required** | Request → Pending Approval → host approves/declines |

### 11.1 Automatic admission

- Eligible + slot available → **Accepted**
- Eligible + full → **Waitlisted**
- Player outside allowed skill levels → **Pending Approval** (manual host approval required)
- Pending requests do not occupy slots

### 11.2 Approval required

1. Player submits join request → **Pending Approval**
2. Request appears in host management view
3. Host approves or declines
4. Approved + slot → **Accepted**; approved + full → **Waitlisted**
5. Player notified of result

Player may **withdraw** pending request (revokes password auth; frees no slot).

### 11.3 Re-request after decline

Declined player may submit a new request after a cooldown. Cooldown duration: **TBD** (or configurable).

### 11.4 Player-facing CTAs by admission state

| State | Primary behavior |
| ----- | ---------------- |
| Not Registered + slot available | Join Session / Request to Join |
| Not Registered + full | Join Waitlist / Request to Join |
| Pending Approval | Request Pending + withdraw |
| Accepted | Accepted / You're In |
| Waitlisted | Position + promotion status |
| Declined | Decline message + cooldown |
| Withdrawn | New request per rules |
| Removed | Removal message |
| Cancelled session | Join disabled |
| Completed session | Read-only history |

Distinguish: joining, being Accepted, arriving (I Am In), ready (I Am Prepared). Do not label all as "Attend."

---

## 12. Session Waitlist

**First In, First Out (FIFO).** First eligible waitlisted player is considered first for promotion.

### 12.1 Automatic promotion

When a slot opens:

1. First eligible waitlisted player notified
2. Player must confirm within time limit (**TBD** / configurable)
3. Confirm → **Accepted**, slot occupied
4. Decline or timeout → next eligible player notified
5. Continue until filled or no eligible players

### 12.2 Manual host promotion

Host promotes waitlisted player → **immediately Accepted**, no confirmation step. Player notified.

### 12.3 Approval when full

Pending approved while full → **Waitlisted** (not bypassing FIFO unless explicit manual promotion).

### 12.4 Capacity reduction

Host may reduce total slots below current Accepted count:

1. Preserve **oldest** Accepted players
2. Move **most recently** Accepted to waitlist (**LIFO** selection)
3. After demotion, waitlist ordering remains **FIFO**
4. Notify each affected player
5. Record in Session Feed

**Ordering data required:** `accepted_at` timestamp, `waitlist_position`, `waitlist_entered_at`.

---

## 13. Skill Eligibility

**Temporary model** — must eventually reconcile with ROTRA tiers / MMR / Skill Rating module.

### 13.1 Temporary levels

`Beginner Low`, `Beginner Mid`, `Beginner High`, `Intermediate Low`, `Intermediate Mid`, `Intermediate High`, `Advanced Low`, `Advanced Mid`, `Advanced High`, `Professional`

Do not call these MMR, Skill Rating, ROTRA Tier, or competitive rank.

### 13.2 Assignment

Assigned by **Que Master** — not self-declared for this feature.

### 13.3 Allowed levels

Host selects **any combination** of levels (not one exact level or single min–max range).

### 13.4 Ineligible players

May submit request; **not** auto-admitted; require manual Que Master approval.

Host UI must show: why manual approval needed, configured levels, player's assigned level, approval decision.

---

## 14. Cancellation Policy

**Free-cancellation cutoff: exactly 5 hours before session start** (default; see §24).

### 14.1 Before cutoff

- Player may cancel registration
- Slot released; waitlist promotion begins
- Password authorization revoked
- Player no longer part of session

### 14.2 After cutoff, before I Am In

- Cancellation still allowed
- Player **remains obligated to pay**
- Player may request waitlist swap/replacement
- Obligation remains until host confirms replacement or manually resolves

Payment is **not** auto-waived on swap request submission.

### 14.3 Waitlist swap request

Confirmed behavior:

- Late-cancelling player may request replacement via waitlist
- Not guaranteed; host must resolve
- Player liable until replacement confirmed or host resolves

**TBD:** which waitlisted player is asked, swap timeout, FIFO requirement for swap, automatic liability transfer.

### 14.4 After I Am In

- Use **Early Exit** — not registration cancellation
- Early Exit payment rules apply
- Revokes password authorization

---

## 15. No-Show Behavior

**No automatic no-show deadline.**

Accepted player who has not marked I Am In:

- Keeps slot
- Remains **Accepted**
- Remains financially obligated
- Is **not** auto-removed
- Does **not** auto-trigger waitlist promotion

Hosts handle exceptional cases manually.

> **Supersedes** prior 15-minute auto-alert behavior. Hosts may still receive optional reminders; no automatic slot release.

---

## 16. Active Session — Accepted but Not Arrived

When **Active** and **Accepted** + **Not Arrived**, show:

- Active status, Overview, current matches, active courts, live scores
- Waiting Players, Match Queue, participant identities (per privacy)
- Session announcements, Session Feed
- Player's own payment status
- **I Am In** button

Player may **Request a Match** before I Am In; match cannot start until all selected players meet live eligibility rules.

---

## 17. Active Session — Arrived Player

After **I Am In**, show:

- Active courts, players playing, live scores, Waiting Players
- Own status, Match Queue info, next assigned match (when applicable)
- Session announcements, Session Feed
- Own amount owed and payment status
- **I Am Prepared**, **Early Exit**, **Request a Match**

Players cannot reorder queue, change others' status, scores, payments, or settings.

---

## 18. Request a Match

Player action creating a **proposal** for the Que Master. Does not create an active match or bypass Match Queue.

### 18.1 Doubles

- Requesting player auto-selected (cannot remove self)
- Select exactly 3 others: 1 partner, 2 opponents

### 18.2 Singles

- Requesting player auto-selected
- Select 1 opponent

### 18.3 Eligible selections

May select players in: Playing, Waiting, Resting, Eating, Not Prepared, Not Arrived. Selection does not mean immediate start — all must be eligible before match becomes startable.

### 18.4 Multiple requests

Player may submit multiple requests (stacked in host view). **Exact duplicates** not allowed (same requester + same lineup + same format; order-independent comparison).

### 18.5 Expiration

Requests do not auto-expire. Remain until approved, modified+approved, declined, cancelled by player, or invalidated.

### 18.6 Que Master approval

Only QM approval required; selected players do not approve. QM may approve, modify+approve, decline, or place approved proposal in Match Queue. QM may modify without re-approval from requester.

### 18.7 Match Queue ordering

Approved request follows **normal** queue order — does not auto-jump to front. QM changes placement via authorized queue controls only.

### 18.8 Cancelling by player

Requester may cancel while match has not started — even if approved/queued. State: **Cancelled by Player**. Remove/invalidate queued match safely; preserve audit history.

### 18.9 Repeated-match protection

Session setting (advisory). Warning to QM on repeated lineup; does not block approval.

### 18.10 Request states

`Pending` → `Approved` | `Modified and Approved` | `Declined` | `Cancelled by Player` | `Invalidated` → `Started` → `Completed` (or `Voided` per match rules).

Protect against: duplicate requests, overlapping active matches, exited/suspended players, invalid combinations, simultaneous match assignment, invalid lineup before approval, cancel after start.

### 18.11 Coexistence with Automatic Queueing

**Request a Match** and **Automatic Queueing** operate in parallel. See [`automatic_queueing.md`](./automatic_queueing.md) §27.

- Player requests do **not** override Queue Priority or automatically jump ahead of automatic candidates.
- Both produce **proposals** requiring Que Master approval before Match Queue placement (unless Full Automatic Queueing is enabled for system-generated candidates only).
- The Que Master may compare a player-requested lineup against the current automatic candidate and alternative candidates.
- A player request may be approved even when Automatic Queueing assigns a lower Match Suitability Score — the UI must show why.
- Approved player requests and approved automatic matches follow the same Match Queue ordering rules (§18.7).

---

## 19. Session Host Interface

Role-aware experience for **Club Owner** and **assigned Que Masters**.

**Before Active:** Lobby information + management controls.

**During Active** — areas (align with Que Master Console tabs; do not duplicate):

| Area | Purpose |
| ---- | ------- |
| **Overview** | Lobby summary, capacity, Feed |
| **Courts** | Live scoring, court status |
| **Match Queue** | Reorder, add, end matches; Automatic Queueing panel when enabled |
| **Players** | Roster, admission, attendance, payments |
| **Requests** | Match request approvals |
| **Financials** | Cost summary, markup (hosts only) |
| **Collections** | Per-player payment tracking |
| **Feed** | Announcements and history |
| **Settings** | Editable session fields |

Club Owner additionally: **Que Master assignment** panel.

See [`../../views/client_app/que_master/que_master_console.md`](../../views/client_app/que_master/que_master_console.md).

---

## 20. Players Management

Hosts view and manage all groups:

Pending requests, Accepted, Waitlisted, Not Arrived, I Am In, I Am Prepared, Waiting, Playing, Resting, Eating, Suspended, Exited, Removed.

Only Club Owner manages assigned Que Masters. Club Owner and Que Masters manage player admission and participation.

---

## 21. Financials

Host-only area. Display (no formulas documented here):

- Court cost, shuttle inventory, planned/actual shuttle cost, other costs, markup
- Estimated total, estimated fee per player, final total, final fee per player
- Total collected, outstanding balance, profit/markup

**Visibility:** Markup and profit — Club Owner and assigned Que Masters only. Regular Players do not see private markup/profit unless another rule explicitly allows.

See [`09_cost_system.md`](./09_cost_system.md).

---

## 22. Collections

Fast host operation. Per financially obligated player:

- Player, amount owed, amount paid, remaining balance, payment status
- Payment method (when recorded), date/time, recorder, optional note

**Statuses:** Unpaid, Partial, Paid.

**Actions:** Mark Paid, Mark Unpaid, Record Partial — simple one-tap where amount already known.

Mark Paid without manual amount when ROTRA or host already configured amount.

**Payment audit:** Every change logs previous/new amount and status, actor, timestamp, optional note. Full history visible to Club Owner and assigned Que Masters. **No changes after Completed.**

ROTRA does not process payments, validate transactions, or require proof upload.

---

## 23. Shuttle Information

See §9.6–9.7. Hosts manage entries; consumed tubes tracked during Active session for actual cost input.

---

## 24. Session Settings

| Setting | Default | Who edits | Editable while Active | Feed entry | Notification | Player visible |
| ------- | ------- | --------- | --------------------- | ---------- | ------------ | -------------- |
| Session title | — | Host | Yes | Yes | No | Yes |
| Description | — | Host | Yes | Yes | No | Yes |
| Club | — | Host | No | — | — | Yes |
| Venue / address | — | Host | Yes | Yes | Yes (venue) | Yes |
| Date | — | Host | Yes | Yes | Yes | Yes |
| Start time | — | Host | Yes | Yes | Yes | Yes |
| End time / duration | — | Host | Yes | Yes | No | Yes |
| Session origin | — | Host | No | — | — | Yes |
| Session type | — | Host | **No** (after Active / matches) | Yes | No | Yes |
| Schedule context | — | Host | Yes | Yes | No | Yes |
| Number of courts | — | Host | Yes | Yes | Yes | Yes |
| Total slots | — | Host | Yes | Yes | Yes (reduction) | Yes (aggregate) |
| Match format | — | Host | Yes | Yes | No | Yes |
| Score limit | — | Host | Yes | Yes | No | Yes |
| Admission mode | Auto | Host | Yes | Yes | No | No |
| Approval required | Off | Host | Yes | Yes | No | No |
| Allowed skill levels | — | Host | Yes | Yes | Yes | Yes |
| Password protection | Off | Host | Yes | Yes | No | N/A |
| Lobby identity visibility | TBD | Host | Yes | Yes | No | Configurable |
| Public live viewing | **Off** | Host | Yes | Yes | No | N/A |
| Waitlisted live viewing | **Off** | Host | Yes | Yes | No | N/A |
| Repeated-match warning | TBD | Host | Yes | Yes | No | No |
| Cancellation cutoff | **5 hours** | Host | Yes | Yes | No | Yes |
| Payment methods | Cash | Host | Yes | Yes | No | Yes |
| Payment instructions (rich text) | — | Host | Yes | Yes | No | Yes |
| Shuttle entries | — | Host | Yes | Yes | No | Brand/qty; cost if enabled |
| Shuttle-cost visibility | **Off** | Host | Yes | Yes | No | When enabled |
| Assigned Que Masters | — | **Club Owner** | Yes | Yes | No | Yes (assigned only) |
| Waitlisted restricted message | — | Host | Yes | No | No | Waitlisted only |

All field changes create Feed entries. Notifications per §27.

### 24.1 Automatic Queueing settings

When **Automatic Queueing** is enabled, additional settings apply. Full definitions, defaults, and allowed values: [`automatic_queueing.md`](./automatic_queueing.md) §22.

| Setting | Default | Who edits | Editable while Active |
| ------- | ------- | --------- | --------------------- |
| Automatic Queueing enabled | Off | Host | Yes |
| Automatic Queueing mode | Normal / Balanced | Host | Yes |
| Operating level | Recommend Only | Host | Yes |
| Automatic placement into Match Queue | Off | Host | Yes |
| Que Master approval required | On | Host | Yes |
| Minimum Match Suitability Score | Configurable | Host | Yes |
| Repetition warning enabled | On | Host | Yes |
| Carry burden limit | Configurable | Host | Yes |
| Maximum consecutive games | Configurable | Host | Yes |
| Minimum rest requirement | Configurable | Host | Yes |
| Overload Training allowed | Off | Host | Yes |
| Overload limit per Player | Configurable | Host | Yes |
| Low-confidence Player restrictions | On | Host | Yes |
| Match explanation visibility (Players) | Off | Host | Yes |
| Alternative candidate count | Configurable (3–5) | Host | Yes |
| Next-match mode override | None | Host | Yes (resets after use) |
| Queue starvation threshold | Configurable | Host | Yes |

All Automatic Queueing setting changes create Session Feed entries.

**Completed** sessions: no edits.

---

## 25. Privacy & Visibility

### 25.1 Public live viewing (default: Off)

When enabled, non-registered viewers see only: active courts, identities on those courts, live scores.

**Not shown:** Waiting Players, Match Queue, waitlist, full roster, collections, payments, financials, private announcements, admin controls.

### 25.2 Waitlisted live viewing (default: Off)

When disabled, waitlisted player sees: waitlist status/position, general session status, custom restricted-access message.

Message is informational — does not change state to Declined.

When enabled: Active Session details per privacy rules.

### 25.3 Accepted but Not Arrived

May see: active courts, identities, matches, scores, Waiting Players, Match Queue, Feed. May Request a Match.

### 25.4 Lobby identity transition

Before Active: Lobby identity-visibility setting applies.

After Active: per §9.4. Hidden identities must not leak via avatars, tooltips, URLs, API payloads, notifications, discovery cards.

---

## 26. Session Feed

Every Que Session has a **Feed** visible from Lobby and Active Overview to all users with Lobby access (subject to password).

### 26.1 Automatic entries

Every session-field change creates a Feed entry, including: title, description, date, times, venue, courts, slots, skill levels, payment instructions/methods, shuttles, privacy settings, password, live-view settings, Que Master assignment, session type (when permitted), cancellation, capacity reduction with affected players (in authorized views).

### 26.2 Entry content

Event title, description, previous/new values, actor, timestamp, optional message, entry type, edited indicator. Apply safe visibility — no private financial leakage to Players.

### 26.3 Manual announcements

Hosts create announcements without field changes (reminders, venue notes, payment reminders).

### 26.4 Editing

Authorized hosts may edit editable content. Show **Edited** indicator; preserve edit history. System-generated facts must not be falsified. Hard deletion: **TBD**.

---

## 27. Notifications

Every session change appears in Feed. The following **also** send push/in-app notifications:

**Session changes (to Pending, Accepted, Waitlisted):** date, start time, venue, cancellation, slot reduction, courts change, allowed-skill change, player removal.

**Admission / waitlist:** join submitted, approved, declined, moved to waitlist, asked to confirm slot, promoted, confirmation timeout.

**Session lifecycle:** starting soon, becomes Active.

**Match requests:** approved, modified+approved, declined, invalidated, cancelled, assigned to match.

**Payments:** reminder, status confirmed.

**Other:** player removed, session cancelled.

Players are **not** required to reconfirm attendance after changes. Hosts resolve concerns manually.

Full templates: [`15_notifications.md`](./15_notifications.md).

---

## 28. Realtime Behavior

**Server is authoritative.** Clients must not treat optimistic state as final.

**Realtime coverage:** lifecycle, join requests, admission, waitlist, capacity, attendance, live statuses, courts, Match Queue, match requests, scores, payments, shuttle consumption, Feed, notifications, settings, Que Master assignments.

**On reconnect:** resync full relevant state; revalidate admission, password auth, queue assignments, payments, waitlist order, match request validity.

**Concurrency protections:**

- Two hosts approving same request
- Two hosts promoting same waitlisted player
- Multiple players claiming final slot
- Capacity change during admission
- Match request approval while player state changes
- Simultaneous payment edits
- Simultaneous Feed edits

Use transactional server logic; last-write-wins only where explicitly documented (multi-QM edits).

---

## 29. State Matrix

Abbreviated matrix — see view docs for UI detail.

| Scenario | Visible | Hidden | Primary CTA |
| -------- | ------- | ------ | ----------- |
| Open + Not Registered | Public preview fields | Roster (if privacy) | Join / Request |
| Open + Pending | Status, withdraw | — | Withdraw |
| Open + Accepted | Full Lobby per auth | Others' payments | — / Cancel |
| Open + Waitlisted | Position | Full roster if privacy | — |
| Active + Accepted + Not Arrived | Live session per §16 | Host controls | I Am In |
| Active + I Am In | §17 view | Host controls | I Am Prepared |
| Active + I Am Prepared | Queue position | — | Request a Match |
| Active + Playing | Court/score | — | — (read-only status) |
| Active + Exited | Read-only history | Live controls | — |
| Closed + Unpaid | Settlement info (own payment) | Others' payments | — |
| Completed | Full history read-only | All edits | — |
| Cancelled | Cancellation notice | Join | — |

---

## 30. Permission Matrix

| Action | Public | Player | Pending | Accepted | Waitlisted | Host |
| ------ | ------ | ------ | ------- | -------- | ---------- | ---- |
| View Lobby (authorized) | Per public live view | Per admission | Yes | Yes | Restricted | Full |
| Join / request | If open | Yes | — | — | — | — |
| Withdraw request | — | — | Yes | — | — | — |
| Cancel registration | — | — | — | Per §14 | — | — |
| I Am In | — | — | — | When Active | — | Override |
| Request a Match | — | — | — | When Active | Per live view | — |
| Manage queue | — | — | — | — | — | Yes |
| Record payment | — | — | — | — | — | Yes |
| Assign Que Master | — | — | — | — | — | CO only |
| Edit session | — | — | — | — | — | Yes (rules §24) |
| Complete session | — | — | — | — | — | Yes |

---

## 31. Transition Tables

### 31.1 Admission

| From | To | Trigger |
| ---- | -- | ------- |
| Not Registered | Pending Approval | Join request (approval mode) |
| Not Registered | Accepted | Auto admit + slot |
| Not Registered | Waitlisted | Auto admit + full |
| Pending Approval | Accepted | Host approve + slot |
| Pending Approval | Waitlisted | Host approve + full |
| Pending Approval | Declined | Host decline |
| Pending Approval | Withdrawn | Player withdraw |
| Declined | Pending Approval | Re-request after cooldown |
| Waitlisted | Asked to Confirm | Slot available (auto promotion) |
| Asked to Confirm | Accepted | Player confirms in time |
| Asked to Confirm | Waitlisted | Decline / timeout → next player |
| Accepted | Cancelled Registration | Player cancel |
| Accepted | Waitlisted | Capacity reduction (LIFO) |
| Accepted | Removed | Host remove |

### 31.2 Attendance

| From | To | Trigger | Reversible by player? |
| ---- | -- | ------- | --------------------- |
| Not Arrived | I Am In | Player confirms | **No** |
| I Am In | I Am Prepared | Player | Yes |
| I Am Prepared | Waiting | System (queued) | — |
| Waiting | Playing | Match starts | — |
| Playing | Waiting / Resting | Match ends | — |
| Any valid | Eating | Player/host | Yes |
| Any valid | Suspended | Host | Host only |
| I Am In+ | Exited | Early Exit | No |

### 31.3 Match request

| From | To | Trigger |
| ---- | -- | ------- |
| — | Pending | Player submits |
| Pending | Approved / Modified+Approved / Declined | Host |
| Pending | Cancelled by Player | Player cancel |
| Approved | Queued | Host places in queue |
| Approved/Queued | Cancelled by Player | Before start |
| Any pre-start | Invalidated | System/host |
| Queued | Started | Match begins |
| Started | Completed / Voided | Match rules |

### 31.4 Payment

| From | To | Trigger |
| ---- | -- | ------- |
| Unpaid | Partial / Paid | Host records |
| Partial | Paid / Unpaid | Host corrects |
| Paid | Partial / Unpaid | Host corrects (before Completed) |
| Any | — | **Blocked** after Completed |

---

## 32. Validation Rules

- Required session fields present before publish
- Valid start/end times; positive slot and court counts
- Valid skill selections; valid Club Owner; assigned Que Masters exist
- Secure password configuration; password cooldown server-enforced
- Rich-text sanitization (payment instructions, Feed) — no script injection, unsafe HTML/embeds, malicious links per content policy
- Payment status transitions audited
- Shuttle quantities non-negative; consumed ≤ planned where enforced
- No duplicate match requests; no duplicate registration
- Waitlist ordering integrity on promotion/reduction
- Match request lineup size matches format (singles/doubles)
- Player eligibility for requests and matches
- Completed-session immutability enforced server-side

---

## 33. Edge Cases

### Admission & capacity
- Simultaneous final-slot requests → server serializes; one wins
- Approve while session becomes full → Waitlisted
- Pending during capacity reduction → unaffected (no slot)
- Concurrent promotions → transactional; one succeeds
- Confirmation timeout → next FIFO player
- Manual promotion during auto confirmation → host action wins per server rules
- LIFO demotion on capacity reduction
- Session expands after reduction → normal admission
- Re-request before decline cooldown → rejected

### Password
- Refresh during cooldown → still blocked
- Device change → auth persists if server-authorized
- Logout/login → auth persists
- Password change → existing auth retained
- Forwarded link → recipient needs password unless already authorized
- Cancel/withdraw/exit → auth revoked
- Cancelled session → password entry meaningless; show cancelled state

### Attendance
- Accidental I Am In attempt → modal must confirm
- Close modal → no state change
- Never arrives → slot retained (§15)
- Request match before arrival → allowed; match not startable until eligible
- Exit while queued → invalidate/remove from upcoming match
- Exit with pending request → request invalidated or cancelled per rules
- Undo I Am In → **not allowed** for player

### Cancellation
- Cancel >5h before → free, slot released
- Cancel <5h before → payment obligation, swap optional
- Cancel after start before I Am In → still obligation + Early Exit path if arrived
- Unresolved swap → player remains liable
- Early Exit after I Am In → §7.3

### Match requests
- Duplicate lineup → blocked
- Multiple from same player → allowed (non-duplicate)
- Selected player Playing / not arrived / suspended / exited → not startable until resolved
- Host modifies lineup → Modified and Approved
- Cancel after approval before start → safe queue removal
- Cancel after start → rejected
- Repeated lineup → warning only
- Same player two startable matches → prevented
- Invalid while queued → Invalidated

### Session editing
- Active venue/date/time/court/slot changes → allowed, Feed + notifications
- Capacity below Accepted → LIFO demotion
- Skill change after joins → notification; ineligible may need review
- Password change after invites → existing auth kept
- Remove QM while Active → allowed (CO)
- Session type change while Active → **blocked**

### Payments
- Mark Paid without amount → allowed when amount known
- Partial, corrections, simultaneous edits → audit + transactional
- Close with unpaid → cannot Complete
- Cancelled with payments → display only; manual refund outside ROTRA
- Edit after Completed → **blocked**

### Feed & notifications
- Edited entry → indicator + history
- Sensitive data → filtered by audience
- Failed delivery → in-app fallback per [`15_notifications.md`](./15_notifications.md)
- Lost Lobby access → Feed not visible until re-authorized
- Completed → full Feed history read-only

---

## 34. Completed Session History

Completed Que Sessions remain accessible **indefinitely**, **read-only**.

Include when available: title, description, club, venue, date/time, final session type, attendees, attendance states, match history, scores, results, voided matches, payment statuses, shuttle usage, announcements, complete Feed + edit history, final financial totals (hosts), Que Masters, Club Owner.

**Cannot:** reopen, reactivate, edit, requeue, create match requests, alter attendance/payments/scores.

Historical correction process: **TBD** — do not invent.

---

## 35. Data-Model Responsibilities

See [`../../database/03_queue_sessions.md`](../../database/03_queue_sessions.md) and [`../../database/04_matches.md`](../../database/04_matches.md).

**Authoritative tables / concepts:**

| Concept | Responsibility |
| ------- | -------------- |
| `queue_sessions` | Lifecycle, settings, password hash, visibility flags |
| `session_registrations` | Admission state, attendance state, timestamps, waitlist position, payment snapshot |
| `session_que_masters` | Assigned Que Masters per session |
| `password_authorizations` | Per-user per-session lobby auth |
| `password_attempts` | Failed attempt timing / cooldown |
| `session_shuttles` | Shuttle entries + consumed tubes |
| `session_feed_entries` | Feed + edit history |
| `match_requests` | Request lineups + status |
| `session_payment_audit` | Payment change audit |
| `matches` | Match Queue + results |

**Timestamps required:** `accepted_at`, `waitlist_entered_at`, `promotion_deadline_at`, `checked_in_at` (I Am In), `prepared_at`, `exited_at`, `completed_at`, `cancelled_at`.

**Privacy:** RLS and API must not expose hidden identities, others' payments, or password hashes.

---

## 36. API & Backend Responsibilities

Each operation requires authorization check and concurrency handling:

`createSession`, `updateSession`, `publishSession`, `startSession`, `closeSession`, `completeSession`, `cancelSession`, `assignQueMaster`, `removeQueMaster`, `submitJoinRequest`, `withdrawRequest`, `approveRequest`, `declineRequest`, `joinWaitlist`, `promoteWaitlisted`, `confirmPromotion`, `cancelRegistration`, `requestWaitlistSwap`, `markIAmIn`, `markIAmPrepared`, `changeLiveStatus`, `earlyExit`, `submitMatchRequest`, `approveMatchRequest`, `declineMatchRequest`, `cancelMatchRequest`, `manageMatchQueue`, `recordPayment`, `correctPayment`, `addFeedAnnouncement`, `editFeedAnnouncement`, `updateShuttles`, `validatePassword`, `enforcePasswordCooldown`, `readCompletedHistory`.

Server validates all transitions in §31 and immutability after Completed.

---

## 37. Deferred Decisions

| Item | Status |
| ---- | ------ |
| Re-request cooldown after decline | **TBD** |
| Waitlist promotion confirmation timeout | **TBD** / configurable |
| Late-cancellation swap algorithm (target player, timeout, liability transfer) | **TBD** |
| Estimation formulas — games per player | **Resolved** — see §9.5 |
| Estimation formulas — wait time, fees, cost allocation | **TBD** |
| Feed hard-deletion behavior | **TBD** |
| Lobby identity visibility default | **TBD** |
| Repeated-match warning default | **TBD** (see also [`automatic_queueing.md`](./automatic_queueing.md) §22) |
| Match DB `finalized` vs `completed` two-step model migration | **TBD** |
| Session postpone rules | **TBD** |
| Historical correction workflow | **TBD** |

---

## 38. Cross-Document References & Deliverables

### A. Files in this documentation pass

| File | Responsibility |
| ---- | -------------- |
| [`08_queue_session.md`](./08_queue_session.md) | **Canonical** Que Sessions specification (this file) |
| [`automatic_queueing.md`](./automatic_queueing.md) | **Canonical** Automatic Queueing matchmaking engine |
| [`../00_ubiquitous_language.md`](../00_ubiquitous_language.md) | Glossary: Lobby, Feed, Request a Match, admission states, cancelled lifecycle |
| [`18_canonical_rules.md`](./18_canonical_rules.md) | Non-negotiable RULE blocks |
| [`09_cost_system.md`](./09_cost_system.md) | Cost formula and payment tracking |
| [`15_notifications.md`](./15_notifications.md) | Notification templates and delivery |
| [`../../database/03_queue_sessions.md`](../../database/03_queue_sessions.md) | Session schema and state machines |
| [`../../database/04_matches.md`](../../database/04_matches.md) | Matches and match requests |
| [`../../views/client_app/player/player_session_view.md`](../../views/client_app/player/player_session_view.md) | Player Lobby / active view |
| [`../../views/client_app/que_master/que_master_console.md`](../../views/client_app/que_master/que_master_console.md) | Host console |
| [`../../views/client_app/club_owner/session_setup.md`](../../views/client_app/club_owner/session_setup.md) | Session creation form |

### B. Canonical rule summary

- Only Club Owner or Que Master creates Que Sessions; CO manages QM assignment.
- Lifecycle: Draft → Open → Active → Closed → Completed; Cancelled terminal from Draft/Open/Active.
- Admission and attendance are separate state machines; pending does not occupy slots.
- Lobby is the Player entry point; becomes Overview when Active.
- Password-protected sessions use invitation links; backend cooldown after failed attempts.
- FIFO waitlist; LIFO demotion on capacity reduction; promotion confirmation **TBD**.
- 5-hour free cancellation cutoff; late cancel retains payment obligation.
- No auto no-show removal.
- Request a Match is proposal-only; QM approval required; no queue jump.
- Automatic Queueing generates candidates; QM controls approval unless Full Automatic enabled (see `automatic_queueing.md`).
- Players see own payment info; not others'; markup/profit hosts only.
- Feed records all field changes; notifications for high-impact events.
- Completed sessions are permanently immutable.

### C. Conflict report

| Existing rule | New canonical rule | Resolution |
| ------------- | ------------------ | ---------- |
| Players create Friendly / Quick Sessions | Only CO/QM create any session | Task spec + §3.1 |
| §8.11 players cannot view cost | §9.3 shows cost to all players | Players see **own** cost breakdown; not others' payment status or markup |
| 15-minute no-show alert | No automatic no-show deadline | §15; optional reminders only |
| QM can manually reorder waitlist | FIFO with manual **promotion** only | §12 FIFO; reorder **TBD** if needed |
| `cancelled` missing from §8.1 diagram | Full cancelled transitions | §5.2 |
| Score override "Unscored" | **Voided** | Terminology sweep |
| `player-organized` / `Schedule type` | Friendly Que Session / Session type | Terminology sweep |

### D. Deferred decisions

Listed in §37.

### E. Coverage checklist

- [x] All roles (Public, Player, Pending, Accepted, Waitlisted, Arrived, Prepared, Playing, Exited, QM, CO)
- [x] All lifecycle states (Draft, Open, Active, Closed, Completed, Cancelled)
- [x] Admission and attendance states and transitions
- [x] Permission and state matrices
- [x] Lobby, password, waitlist, skill eligibility, cancellation, no-show
- [x] Request a Match, host interface, financials, collections, shuttles
- [x] Feed, notifications, realtime, validation, edge cases
- [x] Completed history, data-model and API responsibilities
- [x] Automatic Queueing integration (see `automatic_queueing.md`)
- [x] TBD items explicitly marked

---

## Appendix — Session discovery, venue, umpires, Match Queue

- **Discovery:** §5.3–5.4 and [`../../views/client_app/common/session_discovery_dashboard.md`](../../views/client_app/common/session_discovery_dashboard.md)
- **Match Queue building:** [`../../views/client_app/que_master/que_master_add_match.md`](../../views/client_app/que_master/que_master_add_match.md) (Manual Queueing) and [`automatic_queueing.md`](./automatic_queueing.md) (Automatic Queueing)
- **Umpire scoring:** [`../umpire_app/`](../umpire_app/README.md) and §19 host Courts tab
- **Smart monitoring:** score threshold alerts to host (default 90% of score limit); configurable per session
- **Match completion:** [`18_canonical_rules.md`](./18_canonical_rules.md) RULE-020–025 and [`../00_ubiquitous_language.md`](../00_ubiquitous_language.md) §5
