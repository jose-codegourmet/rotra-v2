# Component: Sidebar — Club Owner

## Purpose
The primary navigation shell for the **Club Owner** role on desktop (≥1024px). Extends the base Player sidebar with a **My Clubs** management section that lists each club the user owns with direct links to manage them, plus an amber **pending requests badge** on the Clubs nav item.

## Breakpoint
**Active at ≥1024px only.** At <1024px, navigation falls back to the bottom nav bar (see `navbar-club-owner.md`).

## Roles
**Club Owner** — manages one or more clubs; approves/rejects join requests, manages members and sessions.

---

## Layout

```
┌─────────────────────┐
│  ROTRA              │  ← Wordmark
│                     │
│  [🏠]  Home         │
│  [🏸]  Clubs     3  │  ← Pending requests badge (amber)
│  [📋]  Sessions     │
│  [👤]  Profile      │
│  [🔔]  Notif     2  │
│                     │
│  ── MY CLUBS ──     │  ← Club management section
│  ┌───────────────┐  │
│  │  Sunrise BC   │  │  ← Club row
│  │  Active · 24m │  │
│  │  [Manage →]   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  Metro BC  •2 │  │  ← Club with pending badge
│  │  Active · 12m │  │
│  │  [Manage →]   │  │
│  └───────────────┘  │
│                     │
│  ─────────────────  │  ← Divider
│                     │
│  [av]  Alex Santos  │
│        Club Owner   │
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
- **Scroll:** sidebar itself scrolls if content overflows (club list can be long)

---

## Sections

### 1. Wordmark

Same as `sidebar-player.md`:
- `ROTRA` — `text-title` (22px, SemiBold), `color-text-primary`, letter-spacing -0.5px
- **Padding:** `space-6` horizontal, `space-6` top, `space-4` bottom

---

### 2. Navigation Items

```
│  [icon]  Home         │
│  [icon]  Clubs     3  │  ← amber badge
│  [icon]  Sessions     │
│  [icon]  Profile      │
│  [icon]  Notifications│
```

Same item spec as Player sidebar with one addition:

#### Clubs item — Pending badge
- Right-aligned on the Clubs row
- **Badge:** `color-warning` background, white text, `text-micro`, `radius-full`, min-width 20px
- Shows **total pending join requests across all owned clubs**
- Hidden when 0 pending
- Distinct amber color differentiates it from the red Notifications badge

#### Nav Item List

| Label | Icon | Route | Badge |
|-------|------|-------|-------|
| Home | house | `/home` | — |
| Clubs | shield | `/clubs` | Pending count (amber) |
| Sessions | calendar | `/sessions` | — |
| Profile | user-circle | `/profile` | — |
| Notifications | bell | `/notifications` | Unread count (red) |

#### Item states (same as Player sidebar)
- **Active:** icon + label `color-accent`, background `color-accent-subtle`
- **Inactive:** icon + label `color-text-disabled`, transparent background
- **Hover:** background `color-bg-elevated`, icon + label `color-text-primary`

---

### 3. My Clubs Section

A dedicated collapsible section listing every club the user owns. Positioned below the nav items, above the divider.

#### Section Header

```
│  ── MY CLUBS ──     │
```

- Label: `MY CLUBS` — `text-micro` (10px), `color-text-secondary`, uppercase, letter-spacing 0.5px
- Thin `color-border` lines flanking the label (extends full row width)
- `space-4` vertical margin above, `space-2` below
- **Not interactive** (section header only, no collapse toggle — always expanded)

> If the Club Owner manages more than 4 clubs, the section becomes scrollable internally (max-height ~240px, `overflow-y: auto`, custom scrollbar `color-bg-elevated`).

#### Club Row

```
┌───────────────────────┐
│  Sunrise BC      • 2  │  ← Name + pending count (if any)
│  Active  ·  24 members│  ← Status + count
│  [ Manage → ]         │  ← CTA link
└───────────────────────┘
```

- **Container:** no card border — plain rows with `space-3` padding horizontal, `space-2` vertical, `radius-md`
- **Hover:** `color-bg-elevated` background
- **Club name:** `text-small` (13px, SemiBold), `color-text-primary`, truncated with ellipsis
- **Pending dot badge** *(conditional)*: filled circle dot `color-warning` (8px) + count (`text-micro`, `color-warning`), right-aligned on the name row — only shown if this specific club has > 0 pending requests
- **Status + member count:** `text-micro` (10px), `color-text-secondary` (e.g. `Active · 24 members` or `Paused · 10 members`)
  - Status color override: `Paused` → `color-text-disabled`
- **Manage link:** `Manage →` — `text-micro` (10px), `color-accent`; tap → `/clubs/:id/manage`
- **Tap anywhere on row** (except Manage link) → `/clubs/:id` (club public profile)

#### When active on `/clubs/:id/manage`
The corresponding club row has a highlighted left stripe:
- Left border: 2px solid `color-accent`
- Background: `color-accent-subtle` at 40% opacity
- Club name: `color-accent`

#### Empty state
If user has no owned clubs (edge case — should not occur post-onboarding):
```
│  No clubs yet.          │
│  [ + Create a Club ]    │
```
- Label: `text-micro`, `color-text-disabled`
- Link: `text-micro`, `color-accent`

---

### 4. Divider

- 1px horizontal line, `color-border`
- `space-4` vertical margin above and below
- Full sidebar width

---

### 5. User Identity Footer

```
│  [av]  Alex Santos  │
│        Club Owner   │
│  [ Logout ]         │
```

Same layout as Player sidebar footer with these differences:
- **Role label** (below name): `Club Owner` — `text-micro`, `color-text-secondary`
  - Replaces the tier label (`Warrior 2`) shown in the Player sidebar
  - Tier is still visible on the Profile page

- **Avatar:** 32×32px, `radius-full`, 1px `color-border` border
- **Name:** `text-small` (13px, SemiBold), `color-text-primary`, truncated
- **Tap on avatar or name** → `/profile`
- **Logout:** `text-small`, `color-text-secondary`; hover → `color-text-primary`

---

## Scrolling Behavior

If the sidebar content exceeds `100vh` (can happen when managing many clubs):
- The sidebar becomes a scrollable container (`overflow-y: auto`)
- The **wordmark** is sticky to the top of the sidebar
- The **user identity footer** is sticky to the bottom of the sidebar
- Navigation items + My Clubs section scroll between them

```
┌─────────────────────┐  ← sticky
│  ROTRA              │
├─────────────────────┤
│  (scrollable area)  │
│  [nav items]        │
│  [club rows]        │
│  ...                │
├─────────────────────┤  ← sticky
│  [av] Alex          │
│  Club Owner         │
│  [ Logout ]         │
└─────────────────────┘
```

---

## Layout Integration

```
┌─────────────┬──────────────────────────────────────────────────┐
│  Sidebar    │  Main content area                               │
│  240px      │  (margin-left: 240px)                            │
│  fixed      │  Page renders here                               │
│             │                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

Same integration as Player sidebar. The sidebar is an app-shell element rendered outside any route component.

---

## Design Tokens

| Token | Usage |
|-------|-------|
| `color-bg-surface` | Sidebar background |
| `color-bg-elevated` | Nav item hover, club row hover |
| `color-border` | Right border, divider, section header lines |
| `color-accent` | Active nav item, Manage link, active club row stripe |
| `color-accent-subtle` | Active nav item background, active club row tint |
| `color-warning` | Clubs badge, per-club pending dot + count |
| `color-text-primary` | Wordmark, active nav labels, club names, user name |
| `color-text-secondary` | Section header, club status/member count, tier/role label |
| `color-text-disabled` | Inactive nav items, paused club status |
| `color-error` | Notifications badge |
| `text-title` 22px SemiBold | Wordmark |
| `text-body` 15px | Nav item labels |
| `text-small` 13px | Club names (SemiBold), user name, logout |
| `text-micro` 10px | Section header, club meta, role label, badges, Manage link |
| `radius-md` 8px | Nav item hover, club row hover |
| `radius-full` | Avatar, badge pills |
