# View: Player Session View (Lobby & Active Session)

## Purpose
The Player-facing Que Session experience — the **Lobby** before the session starts and the read-only **Active Session** view during play. Shows live court activity, Match Queue order, Session Feed, and standings. Players update their own attendance status and may **Request a Match**. All data syncs live via WebSocket.

> **Canonical rules:** [`../../../business_logic/client_app/08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §8 Lobby, §16–17 Active Player experience.

## Route
`/sessions/:id` — authenticated players (and public preview per live-viewing rules)

Que Masters and Club Owners managing the session use `/sessions/:id/manage` instead.

## Roles
**Player** (standard view). **Public visitor** (limited preview when public live viewing enabled).

---

## Preconditions & Entry States

| State | What the player sees |
| ----- | -------------------- |
| **Password required** | Password entry screen — title, date, club only until authorized |
| **Lobby (Open, not Active)** | Full Lobby per admission state — join CTAs, capacity summary, Feed |
| **Active Session** | Overview + Courts + Queue + Feed + Standings tabs |
| **Completed / Cancelled** | Read-only history |

### Admission badge (header)
Pill below title when registered: `PENDING` · `ACCEPTED` · `WAITLISTED` · `DECLINED` · `REMOVED`

Colors: Pending → `color-warning`; Accepted → `color-accent`; Waitlisted → `color-text-secondary`; Declined/Removed → `color-error`.

### Password entry view
Shown when session is password-protected and user not authorized.

- Fields: password input, submit button
- On cooldown: disabled submit + `Try again in [M:SS]`
- On success: navigate to Lobby content
- Visible before auth: session title, date, club name only

---

## Layout

**Lobby (Open):** scrollable single column — session identity, countdown, capacity summary, **session resources (games per player estimate)**, management team, shuttles (per visibility), own payment info, admission CTA, Feed preview.

**Active Session:** full-screen with header and tab row.

```
┌──────────────────────────────────────┐
│  ← Back       [Session Title]        │
│  Saturday, Mar 29    [ACCEPTED]      │
├──────────────────────────────────────┤
│  ⚠ OFFLINE – Reconnecting...         │
├──────────────────────────────────────┤
│  My Status: [ WAITING ▾ ]            │  ← Active only
├──────────────────────────────────────┤
│ OVERVIEW │ COURTS │ QUEUE │ FEED │ STANDINGS │
├──────────────────────────────────────┤
│  [Active tab content]                │
├──────────────────────────────────────┤
│  [ Request a Match ]                 │  ← FAB when Active + eligible
└──────────────────────────────────────┘
```

**Overview tab** = Lobby content adapted for Active session (Live badge instead of countdown).

---

## Components

### Header Bar
- Left: back arrow → `/clubs/:id/sessions`
- Title: `[Session title]` or `Session · [Venue]` when no title (top line) + `[Day], [Date]` (subtitle line, `text-small`, `color-text-secondary`)
- Right: session action button — **role-dependent** (Active session only):
  - **Joined player**: `Leave session` → Early Exit confirm modal
- Right: `ⓘ` icon → **own** cost breakdown modal (player sees only their obligation; not others' payments)
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 64px (taller than standard for two-line title)

### Offline Banner
- Full-width bar, conditionally rendered when WebSocket connection is lost
- Background: `color-warning` at 20% opacity, border-bottom: 1px solid `color-warning`
- Icon: warning triangle (16px, `color-warning`) + text: `OFFLINE – Reconnecting...` — `text-small`, `color-warning`, uppercase
- Animates in from top with `motion-default` (200ms ease-in-out)
- Dismissed automatically on reconnect (smooth fade-out)

### My Status Selector
- Compact row below the offline banner (or below header)
- Label: `My Status:` — `text-small`, `color-text-secondary`
- Current status displayed as a tappable pill: status label + chevron-down icon
- Pill: `color-bg-elevated`, `radius-full`, `text-label`, uppercase
- Status colors:
  - `I Am In` → `color-bg-elevated`, `color-text-primary`
  - `I Am Prepared` → `color-accent-subtle`, `color-accent`
  - `Waiting` → `color-bg-elevated`, `color-text-secondary`
  - `Playing` → `color-accent-subtle`, `color-accent` (non-tappable)
  - `Resting` → `color-bg-elevated`, `color-text-secondary`
  - `Eating` → `color-bg-elevated`, `color-text-secondary`
  - `Exited` → `color-error` tint, `color-error`
- Tap pill → bottom sheet with selectable statuses (only player-controllable ones: I Am In, I Am Prepared, Resting, Eating)
- **I Am In** selection → confirmation modal (irreversible warning) before applying
- Playing/Waiting/Suspended/Exited are read-only (set by system or host)

### Tab Bar
- **Lobby (Open):** single scroll — no tab bar, or Feed as inline section
- **Active:** 5 tabs: **OVERVIEW** · **COURTS** · **QUEUE** · **FEED** · **STANDINGS**
- `text-label` uppercase, 44px height; horizontal scroll on narrow screens
- Active tab: `color-accent`, 2px bottom border
- Inactive: `color-text-disabled`
- Background: `color-bg-surface`, border-bottom: 1px solid `color-border`

### Session Resources Row

Aggregate session planning info shown in the Lobby (Open) and Overview tab (Active). Canonical formula: [`08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md) §9.5.

**Visibility:** All users with authorized Lobby access (not host-only). Hidden when `numCourts`, session duration, or `totalSlots` is missing.

**Content (when available):**

- Number of courts
- Scheduled duration (or remaining duration when Active)
- **Estimated games per player:** `4–12 (typical ~8)`

**Layout:**

```
│  ── Session Resources ───────────────  │
│  2 courts  ·  2h  ·  16 slots        │
│  Estimated games per player: 2–6     │
│  (typical ~4)                        │
│  Based on 10–30 min avg per game     │
```

- Courts / duration / slots: `text-small`, `color-text-secondary`
- Games estimate range: `text-body`, `color-text-primary`
- Typical label: `text-small`, `color-text-secondary` in parentheses
- Footnote: `text-micro`, `color-text-disabled`

**When Active:** recalculate using **remaining** scheduled duration (end time minus current time). Update in realtime as time elapses (no page refresh required).

**Purpose:** Informational only. Does not guarantee minimum games or affect Automatic Queueing.

---

## Tab: Feed

Chronological Session Feed entries — field changes, system events, host announcements.

- Each entry: title, description, actor name, timestamp, `Edited` indicator when applicable
- Tap entry with edit history → sheet showing prior versions (authorized viewers)
- Empty: `No activity yet.`
- Realtime: new entries append without refresh

---

## Tab: Overview (Active)

Same content as Lobby adapted for Active session: Live badge, capacity/arrived counts, **session resources (games per player estimate using remaining duration)**, management team, shuttles, own payment status, Feed summary.

---

## Tab 1: Courts

Live view of all courts in the session.

```
│  ┌────────────────────────────────┐  │  ← Court card (active)
│  │  COURT 1               🟢 LIVE │  │
│  │  ──────────────────────────────│  │  ← Team divider
│  │  TEAM A          vs    TEAM B  │  │
│  │  Alex  •  Maria      Jose • Ana│  │  ← Player names
│  │                                │  │
│  │      18          •     15      │  │  ← Live score (text-display)
│  │                                │  │
│  │  Set 1 / Best of 1             │  │  ← Format + set info
│  │  Running: 12 min               │  │  ← Elapsed time
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Court card (empty)
│  │  COURT 2           ○ AVAILABLE │  │
│  │  No active match               │  │
│  └────────────────────────────────┘  │
```

**Active Court Card:**
- Background: `color-bg-surface`
- Left stripe: 3px `color-accent` (active match indicator)
- Court name + `LIVE` badge (pulsing dot + text, `color-accent`)
- Team A / Team B layout: 2-column with `vs` divider, `text-small` player names
- Score: `text-display` (28px, Bold), `color-text-primary`, centered in each column
- Leading team score: `color-accent` highlight
- Set info + elapsed time: `text-small`, `color-text-secondary`

**Empty Court Card:**
- `color-bg-surface`, `color-border`, `radius-lg`
- `AVAILABLE` badge: `color-bg-elevated`, `color-text-secondary`
- Body text: `No active match` — `text-body`, `color-text-disabled`
- No left stripe

---

## Tab 2: Queue

Ordered list of upcoming matches. Players can see where they are in the queue.

```
│  Next up                             │  ← Section label
│  ┌────────────────────────────────┐  │
│  │  #1 · Court 1 (finishing soon) │  │
│  │  YOU + Maria  vs  Jose + Ana   │  │  ← "YOU" highlighted
│  │  Est. wait: 5 min              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  #2                            │  │
│  │  Ben + Carlo  vs  Lisa + Kim   │  │
│  │  Est. wait: 20 min             │  │
│  └────────────────────────────────┘  │
```

**Queue Match Card:**
- Background: `color-bg-surface`, `radius-lg`, `shadow-card`
- Position number: `#[N]` — `text-label`, `color-text-disabled`
- Team names: `text-body`, `color-text-primary`; `vs` separator: `text-small`, `color-text-secondary`
- Player's own name highlighted: `color-accent` text, Bold
- Estimated wait: `text-small`, `color-text-secondary`
- If player is in the next match: card gets `color-accent-subtle` background + `color-accent` left stripe

**Empty Queue:**
`text-body`, `color-text-secondary`, centered: `No upcoming matches in the queue.`

---

## Automatic Match Display

When the session enables **match explanation visibility** for Players, queued and upcoming automatic matches show a simplified card. Canonical rules: [`../../../business_logic/client_app/automatic_queueing.md`](../../../business_logic/client_app/automatic_queueing.md) §25.

**Do not show:** Effective Strength values, Rating Confidence, internal suitability scores, risk penalties, or harmful labels.

### Player-facing queue card (enhanced)

```
│  ┌────────────────────────────────┐  │
│  │  #1 · Training Match           │  │  ← Mode tag (when enabled)
│  │  YOU + Maria  vs  Jose + Ana   │  │
│  │  Balanced · Est. wait: 5 min   │  │  ← Simplified intensity
│  │  ─── Balanced ───              │  │  ← Simplified balance meter
│  └────────────────────────────────┘  │
```

### Player-facing tags

| Tag | When shown |
| --- | ---------- |
| Balanced | Normal / Balanced mode |
| Training Match | Training Style |
| Recovery Match | Fun / Relaxed recovery assignment |
| High Intensity | Overload Training or hard carry |
| Challenge Match | Elevated difficulty for Player |
| Carry Match | Player is Carrier (respectful wording) |
| Boss Fight | Optional marketing label for Overload (session setting) |
| New Partner | First time paired with partner this session |
| Longest Waiting | Player had highest queue fairness priority |

### Balance meter (Player)

Simplified three-zone meter with text label: `Balanced`, `Slight edge to Team A`, or `Slight edge to Team B`. Optional numeric `~50/50` when session permits — never imply certainty.

### General reason (optional)

When visibility = Summary: one-line reason, e.g. `Rotation fairness — you've waited the longest.`

---

## Tab 3: Standings

Session leaderboard. Updates live after each completed match.

```
│  COURT STANDINGS          This session│
│  ─────────────────────────────────────│
│  #   Name           W   L   Win %    │  ← Table header
│  ─────────────────────────────────────│
│  1  [avatar] Alex   5   1   83%      │  ← Your row (highlighted)
│  2  [avatar] Maria  4   1   80%      │
│  3  [avatar] Jose   3   2   60%      │
│     ...                              │
```

**Standings Row:**
- Height: 56px
- Rank: `text-label`, `color-text-secondary`, left-aligned, 32px wide
- Avatar: 28×28px, `radius-full`
- Name: `text-body`, `color-text-primary`
- W/L/Win%: `text-small`, `color-text-secondary`, right-aligned columns
- Player's own row: `color-accent-subtle` background, rank in `color-accent`

**Table Header:**
- `text-micro` uppercase, `color-text-disabled`
- Border-bottom: 1px solid `color-border`

---

## States

### Live Session (Default)
All tabs populated with live data. My Status selector active.

### Offline
Offline banner visible. Last-known state frozen. No interactions allowed that require server response.

### Session Completed
- Header shows `✓ Completed` status badge
- My Status selector hidden
- Courts tab: all courts show "Session ended"
- Queue tab: shows "Session has ended. No further matches."
- Standings tab: final standings remain, with `FINAL` label on the standings header

---

## Modals

### My Cost Breakdown Modal
Triggered by tapping the ⓘ icon in the header. Shows **only the current player's** estimated/final obligation.

- Title: `Your Session Cost`
- Rows: court share, shuttle share (if shuttle-cost visibility on), markup line if included in player's amount
- **Does not show:** other players' payment status, host markup/profit totals
- Note: `Final amount may change as more shuttles are used.`
- Close: `CLOSE` — secondary outline button, full-width

### I Am In Confirm Modal
- Title: `Confirm Arrival`
- Body: explains I Am In **cannot be undone** by the player
- Actions: `Cancel` (secondary) · `I Am In` (primary, requires explicit tap)

### Request a Match Dialog
FAB or header action when Active and player is registered.

- **Doubles:** requester fixed; pick 1 partner + 2 opponents from session roster
- **Singles:** requester fixed; pick 1 opponent
- May select players who are Playing, Waiting, Resting, Eating, Not Prepared, or Not Arrived
- Submit → `Pending` request; duplicate lineup blocked
- Player may cancel own request until match starts

### Early Exit Confirm Modal
Triggered when joined player taps `Leave session`.

- Explains payment obligation and slot release rules
- Actions: `Stay` · `Request Early Exit` → host confirms payment before exit completes

### Close Session Confirm Modal (Host only — on manage route)
Hosts use Que Master Console — not this view.

- Title: `Close This Session?` — `text-title`, `color-text-primary`
- Body: `Closing ends the session for all players. The queue will stop and no new matches can be assigned.` — `text-body`, `color-text-secondary`
- Confirmation field: label `Type the session name to confirm:` + bold session title; text input must match exactly
- Actions:
  - Primary: `Close session` — `color-error` background (destructive), disabled until typed title matches
  - Secondary: `Cancel` — outline
- On success: session status → `closed`; host redirected to `/find-sessions`

### Leave Session / Early Exit Confirm Modal
Triggered when player updates status to `Exited` via the status selector.

- Title: `Leave This Session?` — `text-title`, `color-text-primary`
- Body: `Your slot will be released to the next waitlisted player. Your payment must be confirmed by the Que Master before you exit.` — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `REQUEST EXIT` — `color-error` background (destructive)
  - Secondary: `Cancel` — outline
- After tapping: QM receives a notification to confirm payment and release slot. Player sees a "Pending exit — waiting for Que Master confirmation" status.

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Tabs, single column per tab |
| Tablet 768–1023px | Tabs, `max-width: 720px`, centered |
| Desktop ≥ 1024px | Tabs replaced by persistent 3-panel side-by-side layout |

### Desktop (≥ 1024px)

On desktop, the 3 tabs are shown **simultaneously** in a horizontal split — no tab switching needed:

```
┌────────────┬──────────────────────────────────────────────────┐
│  Sidebar   │  Session · Hall B  ·  Saturday, Mar 29    [ⓘ]   │
│            │  My Status: [ I AM PREPARED ▾ ]     ⚠ OFFLINE    │
│            ├──────────────┬────────────────┬───────────────────┤
│            │  COURTS      │  QUEUE         │  STANDINGS        │
│            │  (~35%)      │  (~35%)        │  (~30%)           │
│            │              │                │                   │
│            │  [court      │  [queue match  │  [standings       │
│            │   cards      │   cards -      │   table,          │
│            │   stacked]   │   vertical     │   full height]    │
│            │              │   list on      │                   │
│            │              │   desktop]     │                   │
└────────────┴──────────────┴────────────────┴───────────────────┘
```

- **Courts panel** (~35% of main area): court cards stacked vertically; scores are large and readable at desktop size
- **Queue panel** (~35%): queue cards switch from a horizontal scroll to a **vertical stacked list** on desktop (scroll within panel if overflow)
- **Standings panel** (~30%): leaderboard table always visible; sticky header
- Each panel has its own label header row (`COURTS` / `QUEUE` / `STANDINGS` — `text-label`, `color-text-disabled`, uppercase)
- **My Status selector**: stays in the top bar, above the 3-panel split
- **Offline banner**: spans full width above the 3-panel split
- **Content max-width**: `1200px`

**Queue cards on desktop (vertical layout):**
- Full-width within the Queue panel
- Height: 72px per card
- Drag handle on the left, team names centered, estimated time right

### Tablet (768–1023px)
- Tabs remain; `max-width: 720px`, centered
- Queue stays horizontal scroll

**Modals on desktop**: Cost Breakdown and Leave Session modals render as centered overlays.

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Court cards, queue cards, standings |
| `color-bg-elevated` | Status selector pill, empty court |
| `color-accent` | Live badge, player highlight, your row, active tab |
| `color-accent-subtle` | Your queue card, your standings row, active court stripe |
| `color-warning` | Offline banner |
| `color-error` | Exit button |
| `color-text-primary` | Scores, names |
| `color-text-secondary` | Metadata, wait times, tab labels |
| `color-text-disabled` | Rank numbers, empty states |
| `text-display` 28px Bold | Live scores |
| `text-heading` 18px SemiBold | Court name |
| `text-body` 15px | Player names, queue entries |
| `text-small` 13px | Metadata, elapsed time |
| `text-micro` 10px | Table headers |
| `radius-lg` 14px | Court and queue cards |
| `shadow-card` | Court and queue cards |
