# Component: Sidebar — Que Master

## Purpose
The primary navigation shell for the **Que Master** role on desktop (≥1024px). Extends the base Player sidebar with a **Live Console strip** that appears prominently above the nav items whenever the QM is actively managing a session. This gives instant, always-visible access to the QM Console without hunting through the Sessions list.

## Breakpoint
**Active at ≥1024px only.** At <1024px, navigation falls back to the bottom nav bar (see `navbar-que-master.md`).

## Roles
**Que Master** — assigned by a Club Owner; manages courts, queue, and players during active badminton sessions.

---

## Layout

### Default (no active session)

```
┌─────────────────────┐
│  ROTRA              │  ← Wordmark
│                     │
│  [🏠]  Home         │
│  [🏸]  Clubs        │
│  [📋]  Sessions     │
│  [👤]  Profile      │
│  [🔔]  Notif     2  │
│                     │
│  ─────────────────  │  ← Divider
│                     │
│  [av]  Maria Cruz   │
│        Que Master   │
│  [ Logout ]         │
└─────────────────────┘
```

### Active session (QM is managing a session)

```
┌─────────────────────┐
│  ROTRA              │
│                     │
│  ┌───────────────┐  │  ← Live Console strip (prominent)
│  │ 🟢 LIVE       │  │
│  │ Hall B        │  │
│  │ Saturday Mar 29│ │
│  │ 3 courts active│ │
│  │ [OPEN CONSOLE→]│  │
│  └───────────────┘  │
│                     │
│  [🏠]  Home         │
│  [🏸]  Clubs        │
│  [📋]  Sessions  🟢 │  ← green dot
│  [👤]  Profile      │
│  [🔔]  Notif     2  │
│                     │
│  ─────────────────  │
│                     │
│  [av]  Maria Cruz   │
│        Que Master   │
│  [ Logout ]         │
└─────────────────────┘
```

---

## Spec

### Container
- **Width:** 240px, fixed position, full viewport height (`100vh`)
- **Background:** `color-bg-surface`
- **Right border:** 1px solid `color-border`
- **Z-index:** above main content, below modals
- **No collapse** — always visible at ≥1024px

---

## Sections

### 1. Wordmark

Same as `sidebar-player.md`:
- `ROTRA` — `text-title` (22px, SemiBold), `color-text-primary`, letter-spacing -0.5px
- **Padding:** `space-6` horizontal, `space-6` top, `space-4` bottom

---

### 2. Live Console Strip (Conditional)

Only rendered when the QM has a **current** session they are assigned to manage (DB status `active`, or DB status `open` with `dateTime <= now`). **Not** shown for future scheduled enrollments (`dateTime > now`). Positioned directly below the wordmark, before the nav items.

> **Date/time gate:** See [`../common/session_discovery_dashboard.md`](../common/session_discovery_dashboard.md) § Active-Session Guard — Date/Time Gate. Enrollment alone does not trigger the LIVE strip.

```
┌────────────────────────────┐
│  🟢 LIVE  ·  Hall B        │
│  Saturday, Mar 29          │
│  3 courts  ·  12 players   │
│  [ OPEN CONSOLE → ]        │
└────────────────────────────┘
```

- **Background:** `color-accent-subtle` (`#00FF8820`)
- **Border:** 1px solid `color-accent-dim`
- **Border-radius:** `radius-lg` (14px)
- **Left stripe:** 3px solid `color-accent`
- **Margin:** `space-3` horizontal, `space-2` bottom
- **Padding:** `space-3` (12px) all sides

#### Strip Content

**Row 1 — Live indicator + venue**
- Pulsing dot: 8px filled circle, `color-accent`, opacity 1→0.4 cycle, 1.2s ease-in-out
- `LIVE` — `text-micro` uppercase, `color-accent`, letter-spacing 0.5px
- ` · ` separator
- Venue: `text-small` (13px, SemiBold), `color-text-primary`; truncated if too long

**Row 2 — Session date**
- `[Day], [Month Date]` — `text-micro`, `color-text-secondary` (e.g. `Saturday, Mar 29`)

**Row 3 — Live stats** *(optional — shown only after session has started with at least 1 active court)*
- `[N] courts` + ` · ` + `[N] players` — `text-micro`, `color-text-secondary`
- Hidden during session setup phase (before courts go active)

**Row 4 — CTA**
- `OPEN CONSOLE →` — `text-micro` uppercase, `color-accent`, letter-spacing 0.2px
- Displayed on its own row, right-aligned within the strip
- **Tap anywhere on strip** → navigates to `/sessions/:id/manage`

#### Multiple concurrent sessions (edge case)
If the QM is managing more than one session simultaneously, each session gets its own strip stacked vertically. Sessions are ordered by start time (most recent first).

#### Hidden state
When no **current** session (including future scheduled enrollments): strip is fully unmounted (no reserved space). Wire via `useEnrolledSessionState().live` (DB `active` only) or `current` for pre-start queue state per product decision.

---

### 3. Navigation Items

```
│  [icon]  Home         │
│  [icon]  Clubs        │
│  [icon]  Sessions  🟢 │  ← live dot when managing
│  [icon]  Profile      │
│  [icon]  Notifications│
```

#### Sessions item — Live dot indicator

When the QM is managing a **current** session (DB `active`, or `open` with start time reached):
- A small **green pulsing dot** (8px, `color-accent`, same animation as the strip) appears right-aligned on the Sessions row
- Not a number badge — purely a presence indicator
- The dot is hidden when no active session
- Tapping the Sessions item when a live session exists → navigates directly to `/sessions/:id/manage`

#### Nav Item List

| Label | Icon | Route | Badge |
|-------|------|-------|-------|
| Home | house | `/home` | — |
| Clubs | shield | `/clubs` | — |
| Sessions | calendar | `/sessions` or `/sessions/:id/manage` | Live dot (green) |
| Profile | user-circle | `/profile` | — |
| Notifications | bell | `/notifications` | Unread count (red) |

#### Item states
- **Active:** icon + label `color-accent`, background `color-accent-subtle`
- **Inactive:** icon + label `color-text-disabled`, transparent background
- **Hover:** background `color-bg-elevated`, icon + label `color-text-primary`
- **Item height:** 48px; **padding:** `space-4` horizontal; **border-radius:** `radius-md`

#### Notification badge
- Right-aligned on Notifications row
- `color-error` bg, white `text-micro`, `radius-full`, min-width 20px
- Hidden when 0 unread

---

### 4. Active Console — Sidebar Behavior

When the QM is navigated to `/sessions/:id/manage` (QM Console):
- The sidebar **remains visible** — the console runs inside the main content area
- The **Sessions nav item** is marked active (`color-accent` + `color-accent-subtle` bg)
- The **Live Console strip** stays rendered in the sidebar for reference
- The main content area shows the full-width 3-panel console (Courts / Queue / Players)

This allows the QM to navigate away from the console without losing context — they can check their profile or notifications and return via the sidebar strip or Sessions item.

---

### 5. Divider

- 1px horizontal line, `color-border`
- `space-4` vertical margin above and below
- Full sidebar width

---

### 6. User Identity Footer

```
│  [av]  Maria Cruz   │
│        Que Master   │
│  [ Logout ]         │
```

Same layout as Player sidebar with:
- **Role label** (below name): `Que Master` — `text-micro`, `color-text-secondary`
  - Replaces tier label shown in Player sidebar
  - Tier is still viewable on Profile page

- **Avatar:** 32×32px, `radius-full`, 1px `color-border` border
- **Name:** `text-small` (13px, SemiBold), `color-text-primary`, truncated
- **Tap on avatar or name** → `/profile`
- **Logout:** `text-small`, `color-text-secondary`; hover → `color-text-primary`

---

## Scrolling Behavior

Sidebar height is fixed (`100vh`). Content overflows with `overflow-y: auto` if needed (rare — QM sidebar has fewer items than Club Owner):
- **Wordmark:** sticky top
- **User footer:** sticky bottom
- Everything between scrolls

---

## Layout Integration

```
┌─────────────┬──────────────────────────────────────────────────┐
│  Sidebar    │  Main content area                               │
│  240px      │  (margin-left: 240px)                            │
│  fixed      │                                                  │
│             │  QM Console (3-panel):                           │
│             │  ┌──────────┬──────────┬──────────┐             │
│             │  │ COURTS   │ QUEUE    │ PLAYERS  │             │
│             │  └──────────┴──────────┴──────────┘             │
└─────────────┴──────────────────────────────────────────────────┘
```

The QM Console panels fill the main content area while the sidebar remains accessible for quick navigation.

---

## Design Tokens

| Token | Usage |
|-------|-------|
| `color-bg-surface` | Sidebar background |
| `color-bg-elevated` | Nav item hover |
| `color-border` | Right border, divider, avatar border |
| `color-accent` | Active nav item, live strip elements, Sessions live dot |
| `color-accent-subtle` | Active nav item background, live strip background |
| `color-accent-dim` | Live strip border |
| `color-text-primary` | Wordmark, active nav labels, user name, venue in strip |
| `color-text-secondary` | Session date/stats in strip, role label |
| `color-text-disabled` | Inactive nav icon + label |
| `color-error` | Notifications badge |
| `text-title` 22px SemiBold | Wordmark |
| `text-body` 15px | Nav item labels |
| `text-small` 13px SemiBold | Venue in live strip |
| `text-small` 13px | User name |
| `text-micro` 10px | Live label, strip date/stats, CTA, role label, badge counts |
| `radius-md` 8px | Nav item hover/active background |
| `radius-lg` 14px | Live Console strip |
| `radius-full` | Avatar |
