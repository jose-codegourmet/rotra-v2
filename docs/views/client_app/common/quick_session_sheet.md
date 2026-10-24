# View: Quick Session Sheet

## Purpose

Modal dialog for creating a **Friendly Que Session** (Quick Session) from the Home dashboard. Hosts configure title, venue, date, time, courts, format, and score limit — then publish immediately as `open`.

Includes a **live games-per-player estimate** that updates as the host adjusts courts, players per court, and duration.

> **Canonical formula:** [`../../../business_logic/client_app/08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §9.5.

## Trigger

- **Que Master** or **Club Owner** taps `+ Create Session` (or equivalent Quick Session tile) on [`home.md`](./home.md) Quick Actions.
- Opens as a bottom sheet on mobile; centered dialog on desktop.

## Component

`apps/client/src/components/modules/dashboard/quick-session-sheet/QuickSessionSheet.tsx`

## Roles

**Que Master** and **Club Owner** only.

---

## Layout

```
┌──────────────────────────────────────┐
│  START QUICK SESSION                 │
│  Set up a casual session…            │
├──────────────────────────────────────┤
│  Session title *                     │
│  Club (optional)                     │
│  Venue *                             │
│  Date *          Start time *        │
│  Duration *                          │  ← new field
│  Courts *        Players per court * │
│                                      │
│  ┌────────────────────────────────┐  │  ← Live Estimate Panel
│  │  Estimated games per player    │  │
│  │  4–12 per player               │  │
│  │  ~8 typical · 2 courts · 8 slots · 2h │
│  │  Based on 10–30 min avg per game      │
│  └────────────────────────────────┘  │
│                                      │
│  Match format    Score limit         │
├──────────────────────────────────────┤
│  [ Cancel ]              [ OPEN SESSION ] │
└──────────────────────────────────────┘
```

---

## Fields

| Field | Required | Control | Notes |
| ----- | -------- | ------- | ----- |
| Session title | Yes | Text input | Max 80 chars |
| Club | No | Select | Optional; Friendly when empty |
| Venue | Yes | VenuePicker | Pin or confirmed place |
| Date | Yes | DatePicker | Today or future |
| Start time | Yes | Time input | — |
| **Duration** | Yes | Stepper | **New.** See below |
| Courts | Yes | Stepper | 1–12 |
| Players per court | Yes | Select | 2 (singles) or 4 (doubles) |
| Match format | Yes | Select | Best of 1 / Best of 3 |
| Score limit | Yes | Number | 11–30 |

### Duration (new field)

- **Control:** stepper with `−` / `+` buttons and centered value label.
- **Allowed values:** 1h, 1.5h, 2h, 2.5h, 3h, 3.5h, 4h (increments of 0.5h).
- **Default:** 2h.
- **Placement:** after Start time row, before Courts row.
- **Purpose:** drives games-per-player estimate and session end time on publish.

---

## Live Estimate Panel

Read-only panel below Courts / Players per court. Updates immediately when `numCourts`, `playersPerCourt`, or `duration` change.

### Visibility

- Shown when `numCourts`, `playersPerCourt`, and `duration` all have valid values.
- Hidden until all three are set.

### Calculation

Uses §9.5 formula with:

- `totalPlayers` = `numCourts × playersPerCourt` (all on-court slots filled; no separate total-slots field on Quick Session).
- `durationHours` = selected duration value.

### Display

| Element | Example | Style |
| ------- | ------- | ----- |
| Label | `Estimated games per player` | `text-small`, `color-text-secondary` |
| Range | `4–12 per player` | `text-heading`, `color-text-primary` |
| Context line | `~8 typical · 2 courts · 8 slots · 2h` | `text-small`, `color-text-secondary` |
| Footnote | `Based on 10–30 min avg per game` | `text-micro`, `color-text-disabled` |

- **Range:** pessimistic (30 min/game) – optimistic (10 min/game).
- **Typical:** midpoint using 15 min/game on context line.
- Panel background: `color-bg-elevated`; border: 1px solid `color-border`; `radius-lg`; padding `space-4`.

### Example values

| Courts | Players/court | Duration | Total players | Range | Typical |
| ------ | ------------- | -------- | ------------- | ----- | ------- |
| 2 | 4 | 2h | 8 | 4–12 | ~8 |
| 2 | 4 | 1.5h | 8 | 3–9 | ~6 |
| 1 | 4 | 2h | 4 | 4–12 | ~8 |

---

## States

| State | Behavior |
| ----- | -------- |
| Empty / defaults | Duration 2h; estimate visible when courts set |
| Editing | Estimate recalculates on each change |
| Submitting | Form disabled; primary button shows `Opening…` |
| Validation error | Inline field errors; estimate unchanged |
| Closed | Form resets to defaults |

---

## Actions

| Action | Result |
| ------ | ------ |
| Cancel | Close dialog; discard unsaved values |
| Open Session | Validate → create session → status `open` → close dialog → redirect to `/find-sessions/[id]` |

---

## Post-submission dashboard state

After **Open Session**:

1. Session is created with DB status `open`.
2. Creator is auto-enrolled (`admission_status: accepted`, `player_status: not_arrived`).
3. User is redirected to the session Lobby at `/find-sessions/[id]`.

**Dashboard indicators depend on scheduled time:**

| `dateTime` vs now | Dashboard on return to `/dashboard` |
| ----------------- | ----------------------------------- |
| Future (`dateTime > now`) | `QuickSessionButton` **`scheduled`** variant (`UPCOMING SESSION` / `VIEW SESSION`). No Active Session Banner. No LIVE navbar strip. |
| Past or now (`dateTime <= now`) | `QuickSessionButton` **`resume`** variant + Active Session Banner (`IN QUEUE`). LIVE strip after host starts session (DB `active`). |

Creating a Quick Session for a future slot is **scheduling**, not entering an active session. See [`session_discovery_dashboard.md`](./session_discovery_dashboard.md) § Active-Session Guard — Date/Time Gate.

---

## Responsive Layout

| Breakpoint | Layout |
| ---------- | ------ |
| Mobile | Bottom sheet (`rounded-t-xl`); full-width fields |
| Desktop ≥640px | Centered dialog (`sm:max-w-lg`); two-column grid for paired fields |

---

## Cross-References

- Business rules: [`08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §9.5
- Home trigger: [`home.md`](./home.md)
- Full session setup (with `totalSlots`): [`../club_owner/session_setup.md`](../club_owner/session_setup.md)
- Player Lobby display: [`../player/player_session_view.md`](../player/player_session_view.md)
