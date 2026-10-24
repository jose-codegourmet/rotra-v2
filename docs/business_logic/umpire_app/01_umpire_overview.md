# Umpire App — 01 Umpire Overview

## The Umpire Role

An umpire scores a live badminton match in real-time. They tap a button every time a point is scored, track sets, and submit the final result. Their job ends the moment the score is submitted.

The umpire is not a registered platform role in the same sense as a Player or Club Owner. It is a **temporary, match-scoped function** that can be performed by anyone — including someone who has never used the app before.

---

## Access Types

### Quick Umpire (Guest — Unauthenticated)

The primary use case. Anyone with the token link can become the umpire for a match — no account, no installation.

| Property | Value |
|----------|-------|
| Login required | No |
| Access method | One-time token URL / QR code |
| Scope | Single match only |
| Post-match rating | Not available (no identity to attribute it to) |
| Appears in session history | No — anonymous contribution |

### Quick Umpire (Authenticated)

Same token flow, but the user happens to be logged in (or logs in after scoring). The score is attributed to their account and they can optionally rate players.

| Property | Value |
|----------|-------|
| Login required | No — optional |
| Access method | One-time token URL / QR code |
| Scope | Single match only |
| Post-match rating | Available (optional, 1–5 per player per skill dimension) |
| Appears in session history | Yes — attributed to their account |

### Assigned Umpire

A session participant (must be an active member of the session) assigned by the Que Master within the Client App. They receive an in-app push notification that deep-links directly into the Umpire View.

| Property | Value |
|----------|-------|
| Login required | Yes (they are already a logged-in session participant) |
| Access method | In-app push notification + deep link |
| Scope | Single match only |
| Post-match rating | Available |
| Appears in session history | Yes — attributed to their account |

---

## Constraints

### What the umpire can do

- View team compositions (player names, and photos if logged in)
- Tap to add a point to either team
- Undo the last point awarded
- View the current set score tracker
- Submit the final score

### What the umpire cannot do

- Navigate to any other part of the session or platform
- Modify player statuses, queue order, or session settings
- View payment or cost data
- Score more than one match at a time
- Edit the score after submission (only the Que Master can dispute/override)

---

## Umpire vs. Que Master Scoring

The Umpire App is for real-time live scoring. The Que Master can also enter a score — but this is always a manual retrospective entry, not live tap-based.

| Scenario | Who Scores | Via |
|----------|-----------|-----|
| Umpire is present and active | Umpire | Umpire App |
| No umpire assigned | Que Master | Client App score entry |
| Umpire score disputed after submission | Que Master override | Client App dispute flow |

Reference: RULE-023, RULE-024, RULE-039 in [`../client_app/18_canonical_rules.md`](../client_app/18_canonical_rules.md)

---

## Rating Weight

When an umpire submits an optional post-match skill rating, it carries elevated weight in the skill rating calculation:

| Source | Weight Multiplier |
|--------|------------------|
| Umpire | ×3 |
| Que Master | ×3 |
| Opponent | ×2 |
| Partner | ×1.5 |
| Self-assessment | ×1 |

Only authenticated umpires can submit ratings — guest umpires cannot (no identity to attribute).

Reference: RULE-029 in [`../client_app/18_canonical_rules.md`](../client_app/18_canonical_rules.md)
