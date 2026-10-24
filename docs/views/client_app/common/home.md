# View: Home

## Purpose
The post-login landing screen and primary navigation hub. Surfaces the most relevant live context for each role — active session state for players in a session, quick access to clubs and upcoming sessions for everyone else. The home screen is intentionally status-first: if something is happening right now, it surfaces at the top.

## Route
`/home` — authenticated users only

## Roles
All authenticated roles: **Player**, **Que Master**, **Club Owner**. Content sections vary by role.

---

## Layout
Full-screen scrollable page with persistent bottom navigation bar and a top header bar. Content is a single-column feed of status cards and quick-access sections.

```
┌──────────────────────────────────────┐
│  ROTRA           [🔔 3]              │  ← Top header
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │  ← Active Session Banner (if in session)
│  │  🟢 LIVE  •  Court 2 next       │  │  (color-accent-subtle background)
│  │  Sunrise Badminton Club         │  │
│  │  [ VIEW SESSION → ]             │  │
│  └────────────────────────────────┘  │
│                                      │
│  Good evening, Alex.                 │  ← Greeting + name
│                                      │
│  ── Your Clubs ──────────────────    │  ← Section header
│  ┌──────────────┐  ┌──────────────┐  │  ← Club cards, horizontal scroll
│  │ Sunrise BC   │  │ Metro BC     │  │
│  │ 24 members   │  │ 12 members   │  │
│  │ Active       │  │ Active       │  │
│  └──────────────┘  └──────────────┘  │
│  + Discover clubs                    │  ← Link
│                                      │
│  ── Upcoming Sessions ────────────   │  ← Section header
│  ┌────────────────────────────────┐  │  ← Session card
│  │  Sunrise BC · Tomorrow         │  │
│  │  8:00 AM · Hall B              │  │
│  │  Accepted · 12/16 slots        │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── [QM/Owner only] Quick Actions ─  │  ← Role-gated section
│  ┌──────────┐  ┌──────────────────┐  │
│  │ + Session│  │ Pending Requests │  │
│  └──────────┘  └──────────────────┘  │
│                                      │
│  ── Your Stats ──────────────────    │  ← Stats strip
│  Cadet 2  ·  120 EXP  ·  8 Matches  │
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │  ← Bottom nav
```

---

## Components

### Top Header Bar
- Left: `ROTRA` wordmark — `text-title` (22px, SemiBold), `color-text-primary`, letter-spacing -0.5px
- Right: Notification bell icon button (24px stroke icon, `color-text-primary`)
  - Unread badge: small red pill overlaid on icon, `text-micro`, white, `color-error` background
  - Badge shows count (1–99; "99+" if over)
- Background: `color-bg-base`
- Border-bottom: 1px solid `color-border`
- Height: 56px

### Active Session Banner (conditional — visible only if player is registered in an ongoing session)
- Background: `color-accent-subtle` (`#00FF8820`)
- Border: 1px solid `color-accent-dim` (`#00CC6A`)
- Border radius: `radius-lg` (14px)
- Left stripe: 3px solid `color-accent`
- Layout: horizontal — live indicator dot + session info + CTA
- Live dot: 8px filled circle, `color-accent`, pulsing animation (opacity 1→0.4 cycle, 1.2s ease-in-out)
- Label: `LIVE` — `text-micro` uppercase, `color-accent`
- Session info: Club name (`text-heading`, `color-text-primary`) + venue hint (`text-small`, `color-text-secondary`)
- CTA link: `VIEW SESSION →` — `text-label`, `color-accent`, right-aligned
- Margin: `space-4` horizontal, `space-5` top
- Tap anywhere on banner → navigates to the live session view

### Greeting
- Copy: `Good morning/afternoon/evening, [First name].`
- Time-of-day greeting computed from device time: before 12pm = morning, 12–5pm = afternoon, after 5pm = evening
- Style: `text-title` (22px, SemiBold), `color-text-primary`
- Margin: `space-5` horizontal, `space-6` top

### Section Header
- Label: e.g. `Your Clubs`, `Upcoming Sessions`, `Quick Actions`, `Your Stats`
- Style: `text-small` (13px, Regular), `color-text-secondary`, uppercase, letter-spacing 0.5px
- Separator line: thin `color-border` line to the right of the label, filling the row
- Margin: `space-5` horizontal, `space-6` top / `space-3` bottom

### Your Clubs — Horizontal Scroll Row
- Horizontal scrollable row of club cards (no scroll indicator visible)
- Each club card:
  - Width: 160px, height: auto
  - Background: `color-bg-surface`
  - Border: 1px solid `color-border`
  - Border radius: `radius-lg` (14px)
  - Padding: `space-4` (16px)
  - Club name: `text-heading` (18px, SemiBold), `color-text-primary`
  - Member count: `text-small`, `color-text-secondary` (e.g. `24 members`)
  - Status badge: pill — Active = `color-accent-subtle` bg + `color-accent` text; Paused = `color-bg-elevated` + `color-text-secondary`
  - Tap → navigates to `/clubs/:id`
- "Discover clubs" link below the row: `text-small`, `color-accent`, with `+` prefix
- Empty state (no clubs): Single card with dashed border, `+  Join a club` centered label, `color-text-secondary` — tap → `/clubs/discover`

### Upcoming Sessions
- Vertical list of upcoming sessions the player is registered for (next 3 only; "View all" link)
- Each session card:
  - Background: `color-bg-surface`
  - Border: 1px solid `color-border`
  - Border radius: `radius-lg`
  - Padding: `space-4` (16px)
  - Club name + date string (Tomorrow / Monday, Apr 2): `text-body` + `text-small`, `color-text-secondary`
  - Venue + time: `text-small`, `color-text-secondary`
  - Admission status badge: `Accepted` = `color-accent`; `Waitlisted` = `color-warning` (`#FFB800`)
  - Slot fill: `12/16 slots` — `text-small`, `color-text-secondary`
  - Tap → navigates to session detail

### Quick Actions (role-gated)
- 2-column grid of action tiles
- Each tile:
  - Background: `color-bg-surface`
  - Border: 1px solid `color-border`
  - Border radius: `radius-lg`
  - Padding: `space-4`
  - Icon (24px stroke) + label (`text-small`, `color-text-primary`)
- Tiles shown per role:
  - **Que Master**: `+ Create Session`, `Manage Match Queue`
  - **Club Owner**: `+ Create Session`, `Pending Requests`, `Club Stats`
- **`+ Create Session`** opens the Quick Session Sheet modal — see [`quick_session_sheet.md`](./quick_session_sheet.md) for fields, duration stepper, and live games-per-player estimate panel.

### Your Stats Strip
- Single horizontal strip, no card
- Shows: Tier badge + tier name, EXP total, total matches played
- Tier badge: small colored pill matching tier color (grey = Cadet, green = Warrior, blue = Elite, purple = Master, red = Titan, gold = Apex)
- Text: `text-small`, `color-text-secondary`; values in `color-text-primary`
- Tap → navigates to `/profile`

---

## Bottom Navigation Bar
- Background: `color-bg-surface`
- Border-top: 1px solid `color-border`
- Height: 64px + safe area inset (iOS/Android bottom padding)
- Tabs (left to right): **Home** · **Clubs** · **Sessions** · **Profile** · **Notifications**
- Each tab: icon (20px stroke) + label (`text-micro`, 10px, Medium 500)
- Active tab: icon + label in `color-accent`; 2px top border on active tab icon in `color-accent`
- Inactive tab: `color-text-disabled`
- Notification tab shows unread count badge if > 0

---

## States

### Logged In, No Active Session, No Clubs
- No active session banner
- Clubs row shows empty state with "Join a club" CTA
- Sessions section shows empty state: "No upcoming sessions. Join a club to get started." — `text-body`, `color-text-secondary`, centered

### Logged In, In An Active Session
- Active session banner visible at top
- Session card for the live session shows `LIVE` status badge

### QM / Club Owner
- Quick Actions section visible above stats strip
- Pending Requests tile shows live badge count

---

## Responsive Layout

### Breakpoints
| Breakpoint | Range | Navigation | Content |
|-----------|-------|-----------|---------|
| Mobile | < 768px | Bottom nav bar (64px) | Single column, full width |
| Tablet | 768px–1023px | Bottom nav bar (64px) | Single column, `max-width: 600px`, centered |
| Desktop | ≥ 1024px | Left sidebar (240px) | Two-column content grid |

---

### Desktop Navigation: Left Sidebar (≥ 1024px)

The bottom nav bar is **replaced by a left sidebar** at 1024px and above. This sidebar is the persistent navigation shell for all authenticated pages.

```
┌─────────────────┬────────────────────────────────────┐
│  SIDEBAR 240px  │  MAIN CONTENT AREA                 │
│                 │                                    │
│  ROTRA          │  [Page content here]               │
│                 │                                    │
│  [🏠] Home      │                                    │
│  [🏸] Clubs     │                                    │
│  [📋] Sessions  │                                    │
│  [👤] Profile   │                                    │
│  [🔔] Notif  3  │                                    │
│                 │                                    │
│  ─────────────  │                                    │
│  [av] Alex S.   │                                    │
│       Warrior 2 │                                    │
│  [ Logout ]     │                                    │
└─────────────────┴────────────────────────────────────┘
```

**Left Sidebar Spec:**
- Width: 240px, fixed position, full viewport height
- Background: `color-bg-surface`
- Right border: 1px solid `color-border`
- Top section: ROTRA wordmark (`text-title`, `color-text-primary`, `space-6` padding, letter-spacing -0.5px)
- Nav items: 48px height, horizontal flex (icon 20px + label `text-body`), `space-4` horizontal padding
  - Active item: `color-accent` icon + text, `color-accent-subtle` background, `radius-md`
  - Inactive: `color-text-disabled` icon + text
  - Notification count badge on Notifications item
- Bottom section: player avatar (32×32px, `radius-full`) + name (`text-small`) + tier label (`text-micro`, `color-text-secondary`); `Logout` text link below
- Divider between nav and user info: 1px solid `color-border`

**Main Content Area:**
- Margin-left: 240px (sidebar width)
- No top header bar needed on desktop (sidebar provides navigation context)
- Page-level header bars become optional / title-only strips without back buttons

### Desktop Home Layout (≥ 1024px)

```
┌────────────┬───────────────────────────────────────────────┐
│  Sidebar   │  Top bar: "Good evening, Alex."   [🔔]        │
│            ├───────────────────────────────────────────────┤
│            │                                               │
│            │  ┌──────────────────────────────────────────┐ │
│            │  │ 🟢 LIVE · Sunrise BC · Hall B · Court 2  │ │
│            │  └──────────────────────────────────────────┘ │
│            │                                               │
│            │  ── Your Clubs ──────────────────────────     │
│            │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐   │
│            │  │ Club 1 │ │ Club 2 │ │ Club 3 │ │ + Add│   │
│            │  └────────┘ └────────┘ └────────┘ └──────┘   │
│            │                                               │
│            │  ┌────────────────────┐  ┌────────────────┐  │
│            │  │ Upcoming Sessions  │  │ Quick Actions  │  │
│            │  │ [session cards]    │  │ [action tiles] │  │
│            │  └────────────────────┘  └────────────────┘  │
│            │                                               │
│            │  Your Stats: Cadet 2 · 120 EXP · 8 Matches   │
└────────────┴───────────────────────────────────────────────┘
```

- **Top bar** (replaces mobile header bar): full-width bar above content, shows greeting + notification bell
- **Clubs row**: horizontal scroll becomes a 4-column grid (wraps)
- **Lower section**: Upcoming Sessions + Quick Actions split into a **2-column grid** (`calc(60% - space-4)` + `40%`)
- **Stats strip**: stays single row below the 2-column section
- Content max-width: `1200px`, centered in main area with `space-8` horizontal padding

### Tablet (768px–1023px)
- Bottom nav still visible
- Content at `max-width: 640px`, centered
- Clubs row stays horizontal scroll
- Sessions and Quick Actions stack vertically

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page + header background |
| `color-bg-surface` | Cards, bottom nav |
| `color-accent-subtle` | Active session banner background |
| `color-accent` | Live indicator, active nav tab, accent CTAs |
| `color-accent-dim` | Active session banner border |
| `color-warning` | Waitlisted badge |
| `color-error` | Notification badge |
| `color-text-primary` | Greeting, club names |
| `color-text-secondary` | Section headers, metadata |
| `color-text-disabled` | Inactive nav tabs |
| `text-title` 22px SemiBold | Greeting, wordmark |
| `text-heading` 18px SemiBold | Club names in cards |
| `text-small` 13px | Labels, meta, section headers |
| `text-micro` 10px | Nav labels, badges |
| `radius-lg` 14px | Cards |
| `shadow-card` | Club and session cards |
