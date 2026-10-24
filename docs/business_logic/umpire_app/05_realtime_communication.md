# Umpire App — 05 Real-Time Communication

## Overview

The Umpire App maintains a persistent WebSocket connection to the server for the duration of the match. Every point tap is broadcast in real-time to the Que Master's Court View and to all players' Courts tab. Communication is bidirectional — the server can also push state corrections and Que Master actions back to the Umpire App.

---

## Connection Model

```
Umpire App
    ↕ WebSocket
Server (session state store)
    ↕ WebSocket
Client App — Que Master (Court View)
Client App — Players (Courts tab)
```

The server is the **authoritative source of truth**. The Umpire App sends events; the server validates them, applies them to the session state, and fans the update out to all connected subscribers.

Reference: RULE-034 in [`../client_app/18_canonical_rules.md`](../client_app/18_canonical_rules.md)

---

## Events: Umpire App → Server

| Event | Payload | Triggered By |
|-------|---------|--------------|
| `point_added` | `{ team: "A" \| "B", set: 1 }` | Umpire taps `+ POINT` |
| `point_undone` | `{ set: 1 }` | Umpire taps `UNDO` |
| `score_submitted` | `{ sets: [...], winner: "A" \| "B" }` | Umpire confirms submission |

---

## Events: Server → All Subscribers (Que Master + Players)

| Event | What It Updates |
|-------|----------------|
| `score_updated` | Live score on Court View (Que Master) and Courts tab (Players) |
| `set_completed` | Set tracker on both views; point counters reset |
| `match_point_alert` | Smart monitoring: "Match point on Court [X]" push to Que Master |
| `score_submitted` | Court card updates to final score; match status → Review Phase |

---

## Events: Server → Umpire App

| Event | What the Umpire Sees |
|-------|---------------------|
| `token_revoked` | "Umpire access has been revoked by the Que Master" — session ends |
| `session_ended` | "This session has ended" — session ends |
| `match_voided` | "This match has been voided by the Que Master" — scoring disabled |
| `que_master_override` | Optional: informational message that the Que Master has adjusted the score |

---

## Smart Monitoring Integration

As the umpire scores, the server computes score proximity to the win condition and fires alerts to the Que Master. The Umpire App is not aware of these alerts — they are a server-side side effect of each `point_added` event.

| Threshold | Alert to Que Master |
|-----------|---------------------|
| Score reaches 90% of win condition (configurable) | "Match on Court [X] is nearing end" |
| Match point reached (one point from win) | "Match point on Court [X]" |
| Final point scored (score submitted) | "Score submitted for Court [X]" |

Reference: Section 8.7 of [`../client_app/08_queue_session.md`](../client_app/08_queue_session.md)

---

## Offline Handling

If the umpire's connection drops during a match:

```
Connection drops
    ↓
Umpire App shows offline banner: "Reconnecting…"
    ↓
Points tapped while offline are queued locally (in-memory)
    ↓
Connection restored (exponential backoff: 1s, 2s, 4s, 8s, max 30s)
    ↓
Queued events are flushed to the server in order
    ↓
Server applies events and broadcasts the updated score to all subscribers
    ↓
Offline banner clears
```

**Key properties:**
- Points tapped offline are never lost — they are held locally until the connection restores
- If the match ends while the umpire is offline, they are notified on reconnect
- If the Que Master voids the match while the umpire is offline, the umpire sees the void message on reconnect and scoring is disabled

---

## Latency Target

| Metric | Target |
|--------|--------|
| Point tap → Que Master Court View update | < 200ms |
| Point tap → Player Courts tab update | < 500ms |
| Score submission → Match status change | < 1 second |
| Reconnect after connection drop | < 5 seconds (typical) |

---

## Multi-Umpire Consideration

Only one valid umpire token can exist per match at a time. The server enforces this — if a second token is somehow opened while a first is active, the second is rejected immediately. There is no "two umpires scoring simultaneously" scenario.

If the Que Master revokes the token and issues a new one, the new umpire starts from the current server-authoritative score state — no data is lost or reset.
