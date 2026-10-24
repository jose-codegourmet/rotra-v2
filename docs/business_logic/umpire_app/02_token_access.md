# Umpire App — 02 Token Access

## Overview

The Umpire App is accessed exclusively via a **one-time token**. There is no direct URL, no app store entry, and no login page — a person becomes the umpire only when a Que Master generates a token for them.

---

## Token Generation (Que Master Side)

The Que Master generates a token from within the Client App:

```
Que Master opens the match detail for a court
    ↓
Taps "Quick Umpire"
    ↓
System generates a one-time, match-scoped token
    ↓
Client App displays:
    - A shareable URL (e.g. https://app.domain/umpire?token=abc123)
    - A QR code encoding the same URL
    ↓
Que Master shares the QR or link with the intended person
    (e.g. shows their screen, sends via chat)
```

---

## Token Properties

| Property | Value |
|----------|-------|
| Scope | Single match only — cannot be reused on a different match |
| Lifetime | Active until: match score is submitted OR the session ends (whichever comes first) |
| One-claim | Once someone opens the URL and the Umpire View loads, the token is considered claimed |
| Revocable | Que Master can invalidate the token at any time and issue a new one |
| Multiple simultaneous | Only one valid token per match at a time — generating a new token invalidates the previous one |

---

## Token Access Flow (Umpire Side)

```
Person opens the URL or scans the QR code
    ↓
Browser / app validates the token against the server
    ↓
If valid → Umpire View loads for the assigned match
If invalid / expired → Error screen: "This umpire link is no longer active"
    ↓
Umpire scores the match (see 03_scoring_interface.md)
    ↓
After score submission:
    - If not logged in → session ends; no further action required
    - If logged in → optional prompt to rate players
```

---

## QR Code Behavior

- The QR code is generated client-side from the token URL — it is not a separate credential
- Scanning it is identical to tapping the URL
- The Que Master can regenerate the QR at any time (this also rotates the token URL)
- QR codes should not be screenshot-shared publicly — they are match-specific and expire

---

## Revocation

The Que Master can revoke an active token at any time:

```
Que Master opens the match detail
    ↓
Taps "Revoke Umpire Token"
    ↓
Active token is invalidated immediately
    ↓
If an umpire is currently scoring: their session is terminated
    (they see: "Umpire access has been revoked by the Que Master")
    ↓
A new token can be generated immediately
```

**Why revoke?**
- The umpire walked away without submitting
- The wrong person scanned the QR
- The match needs to be re-assigned to a different person

---

## Token Security

| Property | Behavior |
|----------|----------|
| Token format | Cryptographically random UUID (not guessable) |
| Transmission | HTTPS only |
| Storage | Not stored in browser history beyond the session |
| Server-side expiry | Token is invalidated server-side — client cannot extend it |
| Abuse prevention | If the same token is opened by a second device after being claimed, the second attempt is rejected with a generic error |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Token link opened after match is already submitted | Error: "This match has already been scored" |
| Token link opened after session ends | Error: "This session has ended" |
| Umpire loses connection mid-match | Points scored locally are queued; synced on reconnect; session preserved |
| Que Master closes the session while umpire is active | Umpire View shows "Session ended" message; score is not submitted |
| Two people open the same QR simultaneously | First to reach the server claims the token; second receives a rejection |
