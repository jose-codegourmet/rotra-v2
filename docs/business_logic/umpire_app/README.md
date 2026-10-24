# Umpire App — Business Logic

The Umpire App is a minimal, purpose-built scoring interface. It does exactly one thing: lets a person score a live badminton match and send the result back to the Que Master and all session participants.

It is accessed via a one-time token link — no registration, no app install, no login required.

---

## Design Philosophy

> The Umpire App must never slow down a live match.

- **One-handed operation** — all critical actions reachable with a single thumb
- **Large tap targets** — no mis-taps during fast rallies
- **Zero navigation** — the umpire sees only the scoring interface for their assigned match
- **Instant feedback** — score updates broadcast in under 200ms to the Que Master and players
- **Offline resilient** — if the connection drops, points are queued locally and synced on reconnect

---

## Who Uses This App

| User | Access Method |
|------|--------------|
| **Quick Umpire (guest)** | Opens a one-time token URL — no login |
| **Quick Umpire (authenticated)** | Opens a one-time token URL — optionally logs in after scoring |
| **Assigned Umpire** | Receives in-app notification with deep link to Umpire View |

---

## Document Index

| File | Description |
|------|-------------|
| [01_umpire_overview.md](./01_umpire_overview.md) | Role, access types, constraints |
| [02_token_access.md](./02_token_access.md) | Token generation, QR flow, lifecycle, revocation |
| [03_scoring_interface.md](./03_scoring_interface.md) | Scoring UI layout, controls, set tracking |
| [04_score_submission.md](./04_score_submission.md) | Submission flow, confirmation, what happens on submit |
| [05_realtime_communication.md](./05_realtime_communication.md) | WebSocket connection, score broadcast, smart monitoring |

---

## Relationship to Client App

The Umpire App is a satellite to the Client App's session system:

```
Client App (Que Master)
    → Generates a Quick Umpire token for a specific match
        → Umpire App opens (via token URL or in-app deep link)
            → Umpire scores the match in real-time
                → Score is broadcast to Client App (Que Master + Players)
                    → Submission triggers match completion flow in Client App
```

The Umpire App has no awareness of the broader session — it only knows about the single match it was opened for.

---

## Scope Boundaries

| In scope | Out of scope |
|----------|-------------|
| Scoring a single assigned match | Viewing other matches |
| Undo last point | Editing past sets |
| Submitting the final score | Voiding or disputing the score |
| Viewing match teams and players | Viewing player profiles or stats |
| Optional post-match player rating (auth only) | Accessing session queue or cost data |
| Receiving Que Master correction prompts | Modifying any session state |
