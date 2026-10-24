# View: Session List

## Purpose
Lists all **Que Sessions** under a specific club. Players browse and register via the Lobby. **Que Masters** and **Club Owners** see **Create session** to publish new sessions.

## Route
`/clubs/:id/sessions` — authenticated users (club members only for private sessions; public for open sessions)

## Roles
All authenticated roles: **Player**, **Que Master**, **Club Owner**.

---

## Layout
Full-screen scrollable page with header. Filter tabs + session cards. **Create session** FAB: **Que Master** and **Club Owner** only. Badges: **Regular** (Friendly), **Fun Games**, **MMR**.

```
┌──────────────────────────────────────┐
│  ← Back       Sunrise BC · Sessions  │  ← Header bar
├──────────────────────────────────────┤
│  [ ALL ] [ UPCOMING ] [ COMPLETED ]  │  ← Filter tab strip
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │  ← Session card (LIVE)
│  │  🟢 LIVE                       │  │  ← Status badge
│  │  Saturday, Mar 29              │  │  ← Date
│  │  Hall B · 8:00 AM              │  │  ← Venue + time
│  │  12/16 slots  ·  Accepted      │  │  ← Slots + player's status
│  │  ₱120/player · Doubles         │  │  ← Cost + format
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Session card (UPCOMING)
│  │  Saturday, Apr 5               │  │
│  │  Hall B · 8:00 AM              │  │
│  │  6/16 slots  ·  Not Registered │  │
│  │  ₱120/player · Doubles         │  │
│  │               [ REGISTER ]     │  │  ← CTA
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │  ← Session card (COMPLETED)
│  │  ✓ Completed                   │  │
│  │  Mar 22 · Hall A               │  │
│  │  16 players · 5 matches played │  │
│  │              [ VIEW RESULTS ]  │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
│                           [＋]       │  ← FAB: create session (all members)
```

---

## Components

### Header Bar
- Back arrow → `/clubs/:id`
- Title: `[Club Name] · Sessions` — `text-heading`, centered, truncated if long
- Background: `color-bg-base`, border-bottom: 1px solid `color-border`
- Height: 56px

### Filter Tab Strip
- Three text tabs: **ALL** · **UPCOMING** · **COMPLETED**
- Tab height: 40px, `text-label` uppercase
- Active tab: `color-accent`, bottom 2px border `color-accent`
- Inactive: `color-text-disabled`
- Background: `color-bg-base`

### Session Card
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg` (14px)
- Padding: `space-4` (16px)
- Shadow: `shadow-card`
- Margin: `space-3` bottom, `space-4` horizontal
- Tap card → navigates to session detail or live session view

**Card header row (status badge):**
- `LIVE` — `color-accent-subtle` bg, `color-accent` text, pulsing dot (8px, `color-accent`)
- `UPCOMING` — `color-bg-elevated` bg, `color-text-secondary` text
- `OPEN` — `color-accent-subtle` bg, `color-accent` text (open for registration, not started)
- `COMPLETED` — `color-bg-elevated` bg, `color-text-disabled` text
- `CANCELLED` — `color-error` 20% bg, `color-error` text

**Date + venue row:**
- Date: `text-heading` (18px, SemiBold), `color-text-primary`
- Venue + time: `text-small`, `color-text-secondary`

**Slot + player status row:**
- Slot fill: `[N]/[total] slots` — `text-small`, `color-text-secondary`
  - If slots available: text stays muted
  - If full: `FULL` badge in `color-error` tint
- Player's registration status badge (pill):
  - `Accepted` → `color-accent-subtle` bg, `color-accent` text
  - `Waitlisted` → `color-warning` tint bg, `color-warning` text
  - `Not Registered` → not shown (slot count is visible instead)

**Cost + format row:**
- `₱[amount]/player · Doubles / Singles` — `text-small`, `color-text-secondary`
- If cost not set: format only
- Optional pill: **Regular** / **Fun Games** / **MMR**

**CTA (conditional — only on upcoming/open sessions, not active member):**
- `REGISTER` — Primary button, 36px height, right-aligned
- If waitlist only available: `JOIN WAITLIST`
- If already registered: button hidden (status badge replaces it)
- If QR join available: small `QR` icon button next to REGISTER

### Floating Action Button (all club members)
- Circular FAB, 56×56px, `color-accent` background, `color-bg-base` `+` icon (24px)
- `shadow-accent`
- Fixed bottom-right, above bottom nav bar + `space-6` margin
- Tap → `/sessions/new` (Que Master / Club Owner only). See [`08_queue_session.md`](../../../business_logic/client_app/08_queue_session.md).

---

## States

### No Sessions
- Empty state text: `No sessions yet.` / `No upcoming sessions.` / `No completed sessions.` depending on active filter
- For any member: `Create your first session using the + button.`

### Loading
- 3 skeleton cards at standard card height

---

## Modals

### Register for Session Confirm Modal
Triggered when player taps `REGISTER`.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Join this Session?` — `text-title`, `color-text-primary`
- Session detail summary: date, venue, time, cost per player
- Body: `You'll be added as Accepted. You can exit early before or during the session.` — `text-body`, `color-text-secondary`
- Cost callout box: `color-bg-elevated`, `radius-md` — `Expected fee: ₱[amount]`, `text-body`, `color-text-primary`
- Actions:
  - Primary: `CONFIRM REGISTRATION` — `color-accent`, full-width
  - Secondary: `Cancel` — outline, full-width

### QR Join Modal
Triggered when player taps the `QR` icon button on a session card, or arrives via a QR link.

- Background: `color-bg-surface`, `radius-xl`, `shadow-modal`
- Backdrop: `rgba(0,0,0,0.6)`
- Title: `Join via QR Code` — `text-title`
- Large QR code centered (256×256px, white on `color-bg-elevated` background, `radius-md`)
- Below QR: `Scan at the venue to join this session.` — `text-small`, `color-text-secondary`
- Copy link button (secondary outline) below description
- Close icon (✕) top-right of modal

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column list, FAB bottom-right |
| Tablet 768–1023px | Single column, `max-width: 640px`, centered |
| Desktop ≥ 1024px | Left sidebar + 2-column session card grid; FAB → top-right button |

### Desktop (≥ 1024px)

```
┌────────────┬────────────────────────────────────────────────┐
│  Sidebar   │  Sunrise BC · Sessions      [ + Create Session]│
│            ├────────────────────────────────────────────────┤
│            │  [ ALL ]  [ UPCOMING ]  [ COMPLETED ]          │
│            ├────────────────────────────────────────────────┤
│            │                                                │
│            │  ┌──────────────────┐  ┌──────────────────┐   │
│            │  │  LIVE session    │  │  UPCOMING session │   │
│            │  └──────────────────┘  └──────────────────┘   │
│            │  ┌──────────────────┐  ┌──────────────────┐   │
│            │  │  session card    │  │  session card     │   │
│            │  └──────────────────┘  └──────────────────┘   │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

- **FAB**: Replaced by a standard `+ CREATE SESSION` button in the top-right of the page header
- **Session cards**: Displayed in a **2-column grid** (`repeat(2, 1fr)`, gap `space-4`)
  - Cards have fixed height (approx 160px) for uniform grid alignment
  - LIVE card gets a full-width top span (spans both columns) to be visually prominent
- **Filter tabs**: inline above the grid, left-aligned
- **Content max-width**: `1000px`
- **Modals**: Register confirm + QR modal render as centered overlays

### Tablet (768–1023px)
- Single column, `max-width: 640px`
- FAB stays

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Session cards, modals |
| `color-bg-elevated` | Upcoming/completed badge bg, skeleton, cost box |
| `color-accent` | LIVE badge, accepted status, register CTA, FAB |
| `color-accent-subtle` | LIVE/OPEN badge background, accepted badge bg |
| `color-warning` | Waitlisted badge |
| `color-error` | Cancelled badge, full session indicator |
| `color-text-primary` | Date |
| `color-text-secondary` | Venue, slot count, cost |
| `text-heading` 18px SemiBold | Date in card |
| `text-small` 13px | Metadata rows |
| `text-label` 12px | Filter tab labels |
| `radius-lg` 14px | Session cards |
| `shadow-accent` | FAB |
