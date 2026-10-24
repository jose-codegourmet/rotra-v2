# View: Session Setup

## Purpose
The form used to configure and create a **Que Session**. **Club Que Sessions** require **Session type**: **MMR (competitive)** vs **Fun Games (no points)**. **Friendly Que Sessions** omit Session type (always Regular). Only **Club Owner** or **Que Master** may create sessions.

> **Canonical settings:** [`../../../business_logic/client_app/08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §24.

## Route
`/sessions/new` (create) or `/sessions/:id/edit` (edit existing draft)

## Roles
**Que Master** and **Club Owner** only.

---

## Layout
Full-screen scrollable form with header and sticky bottom save/publish bar. Grouped sections — single long scroll.

```
┌──────────────────────────────────────┐
│  ← Back         Create Session       │
├──────────────────────────────────────┤
│  ── Session Identity ──────────────  │
│  Session Title *                     │
│  Description                         │
│  Session origin * (Club / Friendly)  │
│  Schedule context (Regular / Quick)  │
│                                      │
│  ── Session type (Club only) ─────  │
│  ◉ MMR (competitive)                 │
│  ○ Fun Games (no points)             │
│                                      │
│  ── Venue & Time ─────────────────   │
│  Venue, Address, Date, Start, End    │
│                                      │
│  ── Courts & Capacity ─────────────  │
│  Courts *, Players per Court *       │
│  Total Slots (auto)                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Estimated games per player    │  │  ← Live Estimate Panel
│  │  4–12 per player  (~8 typical) │  │
│  │  Based on session duration and │  │
│  │  10–30 min avg per game        │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── Match Format ──────────────────  │
│  Format *, Score Limit *             │
│                                      │
│  ── Admission ─────────────────────  │
│  ◉ Automatic  ○ Approval required    │
│  Allowed skill levels (multi-select) │
│                                      │
│  ── Privacy & Access ──────────────  │
│  Visibility, Password protection     │
│  Lobby identity visibility           │
│  Public / Waitlisted live viewing    │
│  Waitlisted restricted message       │
│                                      │
│  ── Assigned Que Masters (CO) ─────  │
│  Multi-select club Que Masters       │
│                                      │
│  ── Payment ───────────────────────  │
│  Payment methods (Cash, E-wallet)    │
│  Payment instructions (rich text)    │
│                                      │
│  ── Shuttle ───────────────────────  │
│  [+ Add shuttle entry] rows          │
│  Shuttle-cost visible to players ☐   │
│                                      │
│  ── Cost ──────────────────────────  │
│  Court cost *, Markup                │
│  Estimated fee per player (auto)     │
│                                      │
│  ── Options ───────────────────────  │
│  Repeated-match warning ☐            │
│  Cancellation cutoff (default 5h)    │
│  Smart monitoring threshold          │
├──────────────────────────────────────┤
│  [ SAVE DRAFT ]   [ PUBLISH SESSION ]│
└──────────────────────────────────────┘
```

---

## Key Fields

| Field | Required | Notes |
| ----- | -------- | ----- |
| Session title | Yes | Shown in headers and close confirmation |
| Session origin | Yes | Club Que Session vs Friendly Que Session |
| Session type | Club only | MMR or Fun Games |
| Venue & coordinates | Yes | VenuePicker for quick sessions |
| Assigned Que Masters | No | Club Owner may assign; defaults to creator |
| Password protection | No | Optional; stores hash only |
| Allowed skill levels | No | Multi-select temporary levels |
| Payment instructions | No | Rich text; server-sanitized |
| Shuttle entries | No | Brand, planned tubes, cost per tube |

---

## Components

### Header Bar
- Back → Discard Draft confirm if unsaved
- Title: `Create Session` or `Edit Session`

### Sticky Bottom Bar
- `SAVE DRAFT` — secondary
- `PUBLISH SESSION` — primary; validates required fields → status `open`

### Games Per Player Estimate Panel

Live read-only panel in the **Courts & Capacity** section, below Total Slots.

> **Canonical formula:** [`08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §9.5.

**Visibility:** Shown when `numCourts`, `totalSlots`, and session duration (start → end time) are all set.

**Calculation:**

- `totalPlayers` = `totalSlots` (supports rotation when slots exceed on-court capacity).
- `durationHours` = difference between end time and start time on the same date.
- Uses pessimistic (30 min), typical (15 min), and optimistic (10 min) per-game averages.

**Display:**

| Element | Example |
| ------- | ------- |
| Label | `Estimated games per player` |
| Range | `4–12 per player` |
| Typical | `(~8 typical)` inline or on second line |
| Footnote | `Based on session duration and 10–30 min avg per game` |

**Behavior:**

- Updates live as courts, total slots, start time, or end time change.
- Read-only — no host interaction required.
- Informational only; does not feed Automatic Queueing.

**Example (rotation):** 2 courts, doubles, 2h, 16 total slots → `2–6 per player (~4 typical)`.

### Validation
- Courts: 1–20; players per court: 2 or 4; score limit: 11–30
- Club Que Session requires club_id and session type
- Password: minimum length TBD; never shown after save (only reset)

---

## States

| State | Behavior |
| ----- | -------- |
| Empty | Defaults applied; Publish disabled until required fields valid |
| Draft edit | Pre-filled; Save Draft updates without publishing |
| Validation error | Inline field errors; sticky bar shake |

---

## Modals

### Discard Draft
- `Discard unsaved changes?` — Leave / Keep editing

---

## Responsive Layout

| Breakpoint | Layout |
| ---------- | ------ |
| Mobile | Single column; sticky bottom bar |
| Tablet | Two-column for paired fields (date/time) |
| Desktop ≥1024px | Two-column form; actions in header |

---

## Cross-References

- Business rules: [`08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md)
- Games per player formula: [`08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §9.5
- Quick Session Sheet (modal): [`../common/quick_session_sheet.md`](../common/quick_session_sheet.md)
- Automatic Queueing settings: [`automatic_queueing.md`](../../../business_logic/client_app/automatic_queueing.md) §22
- Cost formula: [`09_cost_system.md`](../../../business_logic/client_app/09_cost_system.md)
- Que Master Console: [`../que_master/que_master_console.md`](../que_master/que_master_console.md)
