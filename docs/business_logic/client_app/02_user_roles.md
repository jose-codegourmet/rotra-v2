# 02 — User Roles

## Overview

The app has four roles. All users start as **Players** upon registration. Elevated roles are granted additively — holding a higher role in one club does not change your role in another.

```
── CLIENT APP ──────────────────────────────────────
  Player (default)
    └── Club Owner (per club they created via approved application)
          └── Que Master (assigned per club)

── UMPIRE APP ──────────────────────────────────────
  Quick Umpire (temporary, match-scoped — no account required)

── ADMIN APP ───────────────────────────────────────
  Admin (platform-level, future)
```

---

## 2.1 Player

The base role. Every registered user is a Player.

### How to Become One

* Register via Facebook Login
* One Facebook account = one Player account (enforced server-side)

### Capabilities

| Action | Allowed |
|--------|---------|
| Join clubs | Yes |
| Leave clubs | Yes |
| Register for Que Sessions | Yes |
| Join Que Sessions (admission, waitlist, Lobby) | Yes |
| Create Que Sessions | **No** — Club Owner or Que Master only ([`08_queue_session.md`](./08_queue_session.md) §3) |
| Participate in matches | Yes |
| Submit post-match reviews and ratings | Yes |
| View own stats and profile | Yes |
| View other players' public profiles | Yes |
| Share matches, profiles, leaderboards | Yes |

### Restrictions

| Action | Blocked |
|--------|---------|
| Create any Que Session (Club or Friendly) | Yes — Club Owner or Que Master only ([`08_queue_session.md`](./08_queue_session.md) §3) |
| Modify the Match Queue or match order on sessions they do not host | Yes — session host only |
| Rate players during a session (not post-match) | No — post-match window only |
| Access other players' payment status or host markup/profit | No — see [`08_queue_session.md`](./08_queue_session.md) §9.8 (players see own cost only) |
| Approve or reject club join requests | No — Club Owner only |

---

## 2.2 Club Owner / Host

An elevated role for players who want to create and manage a badminton club.

### How to Become One

* **Per club:** owning a club is not a single global “Club Owner role.” Each new club requires the player to submit a **`club_applications`** row and receive **Admin approval** in the Admin app. Approval inserts the `clubs` row and sets that player as `owner_id`.
* The application captures club name, description, intent, location (city, venue, full address), optional verification fields (Facebook URLs, phone), expected size bucket, and optional notes — see [`../../database/12_club_governance.md`](../../database/12_club_governance.md) and the Client view spec **Club application**.
* A player may own **unlimited** clubs over time (each creation path goes through its own application).
* **SLA:** pending applications not reviewed within **24 hours** of the last applicant edit are auto-rejected; the applicant may re-apply immediately.

> Historical note: early MVP used email-based review; that process is superseded by the Admin app and persisted applications.

### Capabilities

Inherits all Player capabilities within their own club, plus:

| Action | Details |
|--------|---------|
| Create additional clubs | Each new club requires another approved application (same player may own many clubs) |
| Edit club settings | Name, description, membership settings |
| Archive clubs | Clubs are **never hard-deleted**; owners (or admins via demotion) use **archived** state. Historical sessions and records remain. |
| Configure membership settings | Auto-approve ON/OFF, Invite link ON/OFF |
| Invite players directly | Search by name/profile and send invite |
| Approve or reject join requests | With optional note to the player |
| Remove members | Can remove any non-owner member |
| Assign Que Master role | To any number of active club members simultaneously |
| Revoke Que Master role | One or all Que Masters, at any time |
| Oversee all sessions | View all session data under their clubs |
| View payment & attendance summaries | Per-session overview |
| View Club Statistics | Membership analytics and financial summaries (see below) |
| Manage Blacklist | Add or remove players from the club blacklist |

#### Club Statistics View

The Club Owner has access to a **Statistics tab** in the club management panel:

| Stat | Description |
|------|-------------|
| New members | Count of members who joined within a selected time range |
| Consistent members | Members who attended ≥ 3 sessions in the last 30 days (threshold configurable) |
| Members via invite link | Count and list of members who joined through the invite link / QR code |
| Spending per session | Court cost, shuttle cost, total, and markup per queue schedule |
| Aggregate financials | Total spent, total collected, outstanding, and markup "profit" across configurable time ranges (per session / 7d / 30d / 90d / month / year / all time / custom) |
| Blacklisted players | View and manage the club's blacklist |

#### Blacklist Management

* Club Owner can blacklist any player (current member must be removed first)
* Blacklisted players are silently blocked from all entry points (invite link, join request, direct invite)
* Blacklist is per-club only — no effect on the player's other clubs
* Club Owner can remove a player from the blacklist at any time (does not re-add them to the club)
* All blacklist actions are logged with timestamp and optional internal note

### Limitations

* Cannot assign themselves as Que Master via the system — they may run sessions as owner but Que Master assignments are for other members
* Club Owner status in Club A grants no elevated privileges in Club B (unless they own Club B too)
* Cannot approve their own **club application** (admin-only action in Admin app)
* Cannot blacklist a player who is currently an Active Member — must remove first, then blacklist

---

## 2.3 Que Master

A session-level operator role, scoped strictly to the club they are assigned in. Not a platform-wide role.

### How to Become One

* Assigned by the Club Owner of a specific club
* Must be an active member of that club at time of assignment
* A player can hold Que Master status in multiple clubs simultaneously

### Capabilities (within assigned club's sessions)

| Action | Details |
|--------|---------|
| Create and host **Club Que Sessions** | Full session setup including **Session type** (MMR vs Fun Games) |
| Create and host **Friendly Que Sessions** | Informal sessions; always Regular |
| Manage the match queue | Add, reorder, and delete queued matches |
| Drag-reorder upcoming matches | Via the Queue View slider |
| Set and update player statuses | All statuses except Exited (requires payment confirmation) |
| Assign umpires to matches | Any non-playing session participant |
| Track payments | Mark players as Paid / Partial / Unpaid |
| Mark attendance | Override "I Am In" and "I Am Prepared" statuses |
| Finalize matches | Bypasses review wait; marks match complete immediately |
| Rate players after matches | High-weight ratings in skill calculation |
| Trigger early exit | Confirm payment, open slot, promote waitlisted player |

### Restrictions

| Action | Blocked |
|--------|---------|
| Modify club membership settings | Club Owner only |
| Approve or reject join requests | Club Owner only |
| Assign other Que Masters | Club Owner only |
| Access sessions of clubs they are not assigned to | No cross-club access |

---

## 2.4 Quick Umpire (Temporary / Guest)

> **This role operates in the Umpire App — a separate application.**
> Full documentation: [`../umpire_app/README.md`](../umpire_app/README.md)

A temporary, match-scoped role granted to any person — including unauthenticated visitors — via a one-time token generated by the Que Master.

### How to Become One

* Que Master taps "Quick Umpire" on a match in the Court View
* System generates a one-time token, URL, and QR code scoped to that match
* Any person who opens the link becomes the Quick Umpire for that match
* No registration or app install required

### Capabilities

| Action | Guest (not logged in) | Authenticated |
|--------|-----------------------|---------------|
| Access the Umpire View for the assigned match | Yes | Yes |
| Score the match (tap to add points, undo) | Yes | Yes |
| Submit the final score | Yes | Yes |
| Rate players after match (optional, 1–5) | No | Yes |
| Submit text reviews | No | No |
| Access any other session data | No | No |
| Navigate app beyond Umpire View | No | Yes (normal app access) |

### Limitations

* Access is strictly limited to the single assigned match
* Token expires when the match score is submitted or the session ends
* Que Master can revoke the token at any time and issue a new one
* Cannot hold Quick Umpire access for multiple matches simultaneously
* Does not appear as a named participant in session history (guest); authenticated Quick Umpires are attributed by their account

---

## 2.5 Admin (Future — Platform Level)

> **The Admin role operates in the Admin App — a separate application.**
> Full documentation: [`../admin_app/README.md`](../admin_app/README.md)

A platform-level role with global authority. No club affiliation required.

### Planned Capabilities

| Action | Details |
|--------|---------|
| Approve or reject **club applications** and **demotion requests** | Structured queues in Admin app ([`../../database/12_club_governance.md`](../../database/12_club_governance.md)) |
| Platform-wide moderation | Flagged reviews, account bans, content removal |
| Manage global rankings | Featured leaderboards, cross-club standings |
| Configure gamification parameters | EXP rates, tier thresholds, badge criteria |
| View platform analytics | Active clubs, sessions per week, retention |

---

## Role Comparison Matrix

| Capability | Player | Que Master | Club Owner | Quick Umpire (guest) | Quick Umpire (auth) | Admin |
|-----------|--------|------------|------------|----------------------|---------------------|-------|
| Join clubs | ✓ | ✓ | ✓ | — | ✓ | — |
| Participate in matches | ✓ | ✓ | ✓ | — | ✓ | — |
| Submit post-match reviews | ✓ | ✓ | ✓ | — | ✓ | — |
| Score an assigned match (Umpire View) | — | — | — | ✓ | ✓ | — |
| Rate players after umpiring | — | — | — | — | ✓ | — |
| Create Que Sessions | — | ✓ | ✓ | — | — | — |
| Set Session type (MMR / Fun Games) on Club Que Sessions | — | ✓ | ✓ | — | — | — |
| Manage queue | — | ✓ | ✓ | — | — | — |
| Rate players (session) | — | ✓ | ✓ | — | — | — |
| Track payments | — | ✓ | ✓ | — | — | — |
| Finalize matches | — | ✓ | ✓ | — | — | — |
| Generate Quick Umpire token | — | ✓ | ✓ | — | — | — |
| Assign Que Masters (multiple) | — | — | ✓ | — | — | — |
| Approve join requests | — | — | ✓ | — | — | — |
| Configure club settings | — | — | ✓ | — | — | — |
| View club statistics & financials | — | — | ✓ | — | — | — |
| Manage blacklist | — | — | ✓ | — | — | — |
| Approve club applications / demotions | — | — | — | — | — | ✓ |
| Moderate platform | — | — | — | — | — | ✓ |
| Configure gamification | — | — | — | — | — | ✓ |

---

## Role Transition Rules

* A Player becomes the **Club Owner of a specific club** when their **`club_applications`** row for that club is approved in the Admin app (which mints the `clubs` row)
* A Club Owner becomes a Que Master only if assigned by another Club Owner in a different club (they cannot self-assign)
* Que Master access is revoked when: (a) Club Owner revokes it, (b) the player is removed from the club
* Club Owner access for a given club is revoked via **Admin demotion / transfer / archive** flows ([`../../database/12_club_governance.md`](../../database/12_club_governance.md)); other clubs the same player owns are unaffected unless separately actioned
* All role changes are logged with timestamp and actor
