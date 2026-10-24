# Component: Sidebar — Player

## Purpose
The primary navigation shell for the **Player** role on desktop (≥1024px). A fixed left sidebar that replaces the mobile bottom navigation bar entirely. Contains the ROTRA wordmark, all nav items, a conditional Live Session strip (when the player is in an active session), and a user identity footer.

> **Client v1 (implemented):** The **Notifications** row shows an unread **badge** on the bell at the `md` icon rail, and a **right-aligned badge** next to the label at `lg`. See [`../common/notification_center.md`](../common/notification_center.md) § Implementation status (Client app v1).

## Breakpoint
**Active at ≥1024px only.** At <1024px, navigation falls back to the bottom nav bar (see `navbar-player.md`).

## Roles
**Player** — standard authenticated user.

---

## Layout

```
┌─────────────────────┐
│  ROTRA              │  ← Wordmark
│                     │
│  ┌───────────────┐  │  ← Live Session strip (conditional)
│  │ 🟢 LIVE       │  │
│  │ Sunrise BC    │  │
│  │ Hall B        │  │
│  │ [VIEW SESSION→]│  │
│  └───────────────┘  │
│                     │
│  [🏠]  Home         │  ← Nav item (active)
│  [🏸]  Clubs        │
│  [📋]  Sessions     │
│  [👤]  Profile      │
│  [🔔]  Notifications│  ← with unread badge
│                     │
│  ─────────────────  │  ← Divider
│                     │
│  [av]  Alex Santos [⋮]│  ← User identity + menu
│        Warrior 2      │
└─────────────────────┘
```

---

## Spec

### Container
- **Width:** 240px, fixed position, full viewport height (`100vh`)
- **Background:** `color-bg-surface`
- **Right border:** 1px solid `color-border`
- **Z-index:** above main content, below modals
- **No collapse/toggle** — always visible at ≥1024px (no hamburger)

---

## Sections

### 1. Wordmark

```
┌─────────────────────┐
│  ROTRA              │
└─────────────────────┘
```

- **Content:** `ROTRA` — `text-title` (22px, SemiBold), `color-text-primary`, letter-spacing -0.5px
- **Padding:** `space-6` (24px) horizontal, `space-6` top, `space-4` bottom
- **Height:** ~64px

---

### 2. Live Session Strip (Conditional)

Only rendered when the player has a **current** enrolled session (DB status `active`, or DB status `open` with `dateTime <= now`). **Not** shown for future scheduled enrollments. Positioned between the wordmark and the nav items.

> **Date/time gate:** See [`../common/session_discovery_dashboard.md`](../common/session_discovery_dashboard.md) § Active-Session Guard — Date/Time Gate. Wire via `useEnrolledSessionState().current` (not `scheduled`).

```
┌───────────────────────┐
│  🟢 LIVE              │
│  Sunrise Badminton    │
│  Hall B               │
│  [ VIEW SESSION → ]   │
└───────────────────────┘
```

- **Background:** `color-accent-subtle` (`#00FF8820`)
- **Border:** 1px solid `color-accent-dim`
- **Border-radius:** `radius-lg` (14px)
- **Left stripe:** 3px solid `color-accent`
- **Margin:** `space-3` horizontal (fits within sidebar padding), `space-2` bottom
- **Padding:** `space-3` (12px) all sides

#### Strip Content
- **Live label row:** 8px pulsing dot (`color-accent`, opacity 1→0.4, 1.2s ease-in-out) + `LIVE` — `text-micro` uppercase, `color-accent`, letter-spacing 0.5px
- **Club name:** `text-small` (13px, SemiBold), `color-text-primary`; truncated with ellipsis if > 1 line
- **Venue:** `text-micro`, `color-text-secondary`
- **CTA:** `VIEW SESSION →` — `text-micro`, `color-accent`, displayed on its own row, right-aligned within the strip
- **Tap anywhere on strip** → navigates to `/sessions/:id`

#### Hidden state
When no **current** session (including future scheduled enrollments): strip is fully unmounted (not hidden with CSS — no reserved space).

---

### 3. Navigation Items

```
│  [icon]  Home         │  ← active
│  [icon]  Clubs        │
│  [icon]  Sessions     │
│  [icon]  Profile      │
│  [icon]  Notifications│
```

- **Item height:** 48px
- **Layout:** horizontal flex — icon (20px stroke) + label (`text-body`, 15px, `color-text-primary` or `color-text-disabled`)
- **Padding:** `space-4` (16px) horizontal
- **Border-radius on hover/active background:** `radius-md` (8px)
- **Gap between icon and label:** `space-3` (12px)

#### Active item
- Icon + label: `color-accent`
- Background: `color-accent-subtle`
- No left border indicator (background fill is the indicator)

#### Inactive item
- Icon + label: `color-text-disabled`
- Background: transparent
- Hover: `color-bg-elevated` background, icon + label shift to `color-text-primary`

#### Nav Item List

| Label | Icon | Route |
|-------|------|-------|
| Home | house | `/home` |
| Clubs | shield | `/clubs` |
| Sessions | calendar | `/sessions` |
| Profile | user-circle | `/profile` |
| Notifications | bell | `/notifications` |

#### Notification badge
- Positioned right-aligned on the Notifications row (replaces the icon badge style used in bottom nav)
- Pill: `color-error` bg, white text, `text-micro`, `radius-full`, min-width 20px, height 20px
- Shows count 1–99 or `99+`
- Hidden when 0 unread

---

### 4. Divider

- 1px horizontal line, `color-border`
- `space-4` vertical margin above and below
- Full width of sidebar (flush to edges, no horizontal padding)

---

### 5. User Identity Footer

```
│  [av]  Alex Santos        [⋮]  │  ← Row trigger (opens menu)
│        Warrior 2               │
│  ┌─────────────────────────┐   │  ← Popup (when open, above row)
│  │  Profile                │   │
│  │  Account Settings       │   │
│  │  ─────────────────────  │   │
│  │  Log Out                │   │
│  └─────────────────────────┘   │
```

Pinned to the bottom of the sidebar (`mt-auto`, top border `color-border`, horizontal padding).

#### User row (trigger)

- **Layout:** full-width button, horizontal flex — `SmallUserCard` (avatar + name + tier) + **MoreVertical** (⋮) icon on the right (desktop only)
- **Avatar:** 32×32px, `radius-full`, 1px `color-border` border
- **Name:** `text-small` (13px, SemiBold), `color-text-primary`, truncated with ellipsis, max 1 line
- **Tier label:** `text-micro` (10px), `color-text-secondary` (e.g. `Warrior 2`)
- **Hover:** `color-bg-elevated` background on the row
- **Tap row or ⋮** → toggles popup menu (`aria-expanded`)

#### Data source

- **Name:** `profiles.name` from the signed-in player’s profile row (passed into the shell from the server). If the profile payload is not yet available, the UI may fall back to Facebook `full_name` (or equivalent) from Supabase Auth `user_metadata` until the profile loads.
- **Avatar:** `profiles.avatar_url` when set to a valid `http(s)` URL; otherwise fall back to Facebook `avatar_url` / `picture` from auth metadata.

#### Popup menu (above the user row)

- **Position:** `absolute`, `bottom-full`, full width of footer, `mb-2`, `z-10`
- **Container:** `color-bg-surface`, 1px `color-border`, `radius-lg`, `shadow-modal`
- **Items** (each row min-height 44px, uppercase `text-small`, bold, tracking-widest):
  - **Profile** — user-circle icon → `/profile` (admin) or `/profile/:id` (player)
  - **Account Settings** — settings icon → `/settings/account` (see [`../common/account_settings.md`](../common/account_settings.md))
  - **Divider** — 1px `color-border`
  - **Log Out** — `color-error` text; tap closes menu and opens logout confirmation dialog
- **Dismiss:** click outside the footer container closes the menu

---

## Layout Integration

The sidebar is rendered as part of the app shell, not within any page. All page routes render their content to the right of the sidebar.

```
┌─────────────┬──────────────────────────────────────────────────┐
│  Sidebar    │  Main content area                               │
│  240px      │  (margin-left: 240px)                            │
│  fixed      │  Page renders here                               │
│             │                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

- **Main content margin-left:** 240px (matches sidebar width)
- **Main content full height:** `100vh`, independent scroll
- **No top header bar** on desktop — page-level headers within main content area take over (see `navbar-player.md` section 1)

---

## Design Tokens

| Token | Usage |
|-------|-------|
| `color-bg-surface` | Sidebar background |
| `color-bg-elevated` | Nav item hover background |
| `color-border` | Right border, divider, avatar border |
| `color-accent` | Active nav icon + label, live strip elements |
| `color-accent-subtle` | Active nav item background, live strip background |
| `color-accent-dim` | Live strip border |
| `color-text-primary` | Wordmark, active nav label, name |
| `color-text-secondary` | Tier label, logout link |
| `color-text-disabled` | Inactive nav icon + label |
| `color-error` | Notification badge background |
| `text-title` 22px SemiBold | Wordmark |
| `text-body` 15px | Nav item labels |
| `text-small` 13px | User name, logout |
| `text-micro` 10px | Live label, tier, notification count, venue |
| `radius-md` 8px | Nav item hover/active background |
| `radius-lg` 14px | Live session strip |
| `radius-full` | Avatar |
