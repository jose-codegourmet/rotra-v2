# Admin App — 02 Kill Switches

## Overview

Kill switches are boolean feature flags that allow any feature in the Client App to be turned off instantly — without a code deploy, server restart, or downtime. They are the primary safety mechanism for new features and the first response to incidents.

Kill switches are managed from the Admin App and take effect in real-time across all Client App instances.

---

## How Kill Switches Work

```
Admin toggles switch OFF in Admin App
    ↓
Feature flag written to the platform config store
    ↓
Client App checks flag on each relevant request / render
    ↓
Feature is hidden or returns a graceful fallback (not an error)
```

The Client App must treat every kill-switched feature as "disabled but not broken" — users see a disabled state or nothing, not an error screen.

---

## Kill Switch Registry

Each switch has a key, a scope, a default state, and a fallback behavior.

### Authentication & Access

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `auth.facebook_login` | Facebook OAuth login | ON | Show "Login temporarily unavailable" message |
| `auth.new_registrations` | New player registrations | ON | Existing users can still log in; new signups blocked with message |

---

### Club System

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `clubs.creation` | Club creation by Club Owners | ON | "Club creation is temporarily disabled" |
| `clubs.invite_links` | Invite link / QR join method | ON | Invite links return a disabled state page |
| `clubs.join_requests` | Request-to-join flow | ON | Join request button hidden |
| `clubs.blacklist` | Club blacklist feature | ON | Blacklist actions hidden; existing blacklists remain enforced |

---

### Queue Sessions

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `sessions.creation` | Session creation by Que Masters | ON | "Session creation temporarily unavailable" |
| `sessions.qr_join` | QR code join for sessions | ON | QR button hidden; in-app join still works |
| `sessions.cost_system` | Cost and payment tracking | ON | Cost fields hidden; session runs without cost tracking |
| `sessions.waitlist` | Waitlist and auto-promotion | ON | No waitlist; session is hard-capped at slot limit |
| `sessions.smart_monitoring` | Score threshold alerts to Que Master | ON | Que Master receives no proximity alerts |

---

### Umpire App

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `umpire.quick_umpire_tokens` | Quick Umpire token generation | ON | Token generation button hidden; only assigned umpires allowed |
| `umpire.guest_scoring` | Unauthenticated umpire scoring | ON | Token link requires login before accessing Umpire View |

---

### Ratings & Reviews

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `ratings.post_match_review` | Post-match review submission | ON | Review prompt skipped; match completes on score only |
| `ratings.skill_rating` | Skill rating calculation and display | ON | Ratings hidden; no new ratings accepted |
| `ratings.sandbagging_detection` | Anti-sandbagging system | ON | Detection paused; no new flags raised |

---

### Gamification

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `gamification.exp_earning` | EXP awards for all actions | ON | No EXP awarded; existing totals preserved |
| `gamification.leaderboard_global` | Global platform leaderboard | ON | Global leaderboard page returns 503 or hidden |
| `gamification.badges` | Badge system | ON | Badges hidden on profiles; no new badges awarded |

---

### Sharing & Social

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `sharing.match_cards` | Match result share cards | ON | Share button hidden |
| `sharing.og_cards` | Open Graph meta on shareable URLs | ON | OG tags omitted; links still work without rich preview |

---

### Tournaments

| Switch Key | Feature | Default | Fallback When OFF |
|------------|---------|---------|-------------------|
| `tournaments.module` | Entire tournament module | OFF (Phase 3) | Tournament nav item hidden |

---

## Switch State Display

In the Admin App, each kill switch displays:

| Field | Description |
|-------|-------------|
| Key | The system identifier |
| Feature name | Human-readable label |
| Current state | ON / OFF with color indicator |
| Last changed | Timestamp + admin who changed it |
| Scope | Which app(s) the switch affects |
| Active incident | Optional note linking to the incident that triggered the toggle |

---

## Emergency Protocol

For a platform-wide incident:

```
1. Admin identifies the affected feature
2. Toggles the relevant kill switch(es) OFF
3. Adds an incident note to the switch (visible in audit log)
4. Monitors platform behavior via analytics
5. When incident is resolved, toggles switch(es) back ON
6. Documents resolution in the incident log
```

There is no "master off switch" that disables the entire platform — use `auth.new_registrations` + `sessions.creation` + `auth.facebook_login` in combination if needed for a full service halt.

---

## Rules

- Kill switches are evaluated server-side. Client-side checks are for UI only.
- A feature hidden by a kill switch must never return an unhandled error — always a graceful fallback.
- Switching a feature OFF never deletes data. Data is preserved and resumes correctly when the switch is turned back ON.
- All switch state changes are logged immutably with timestamp and admin identity.
