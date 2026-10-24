# Component: Navbar — Club Owner

## Purpose
The top navigation bar for the **Club Owner** role. Extends the base Player navbar with a live **pending requests badge** on the Clubs tab and a club management shortcut in the desktop top bar. Club Owners can manage one or more clubs — pending join requests from all their clubs are aggregated into the badge count.

> **Client v1:** The shared Player shell bell, dropdown (desktop), mobile deep-link, and `/notifications` page follow [`../common/notification_center.md`](../common/notification_center.md) § Implementation status (Client app v1); Club Owner–specific chips are not wired until club APIs exist.

> **Desktop-first note:** The sidebar (`sidebar-club-owner.md`) is the primary navigation surface at ≥1024px. This navbar surfaces only in the main content area as a slim page-level bar.

## Roles
**Club Owner** — manages one or more clubs; can assign Que Masters, approve/reject join requests, and view club financials.

---

## 1. Desktop Top Bar (≥ 1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Page Title]                            [3 pending]        [🔔  2]   │
└────────────────────────────────────────────────────────────────────────┘
```

### Spec
- **Height:** 56px
- **Background:** `color-bg-base`
- **Border-bottom:** 1px solid `color-border`
- **Left:** Page title — `text-title` (22px, SemiBold), `color-text-primary`
  - On `/home`: greeting — `Good [time], [First name].`
- **Center-right:** Pending requests chip *(conditional — hidden when 0 pending)*
  - Pill shape: `color-warning-subtle` bg, `color-warning` border + text
  - Label: `[N] pending` — `text-small` (13px), `color-warning`
  - Tap → navigates to the club's Requests tab (`/clubs/:id/manage?tab=requests`)
  - If multiple clubs have pending requests, chip label shows total count — tap opens a club selector dropdown listing each club with its individual count
- **Right:** Notification bell with unread badge (same spec as Player navbar)

### Page-Specific Variations

| Route | Left content | Center-right | Right |
|-------|-------------|-------------|-------|
| `/home` | `Good [time], [First name].` | Pending chip (if > 0) | 🔔 bell |
| `/clubs` | `Clubs` | Pending chip (if > 0) | 🔔 bell |
| `/clubs/:id` | `← [Club name]` | — | 🔔 bell |
| `/clubs/:id/manage` | `← Manage · [Club name]` | — | 🔔 bell |
| `/sessions` | `Sessions` | — | 🔔 bell |
| `/profile` | `Profile` | — | ⚙ settings |
| `/notifications` | `Notifications` | — | — |

---

## 2. Mobile / Tablet Top Header Bar (< 1024px)

```
┌──────────────────────────────────────┐
│  ROTRA                      [🔔  2]  │
└──────────────────────────────────────┘
```

Same base spec as Player navbar with these additions:
- **Right area:** notification bell only (pending count is surfaced in bottom nav Clubs badge instead)

### Inner Page Variant

```
┌──────────────────────────────────────┐
│  ← Back       Sunrise BC — Manage    │
└──────────────────────────────────────┘
```

- On Club Owner Hub pages: title format is `[Club Name] — Manage`
- No extra icons on right for management pages (tab navigation is inside the page)

---

## 3. Bottom Navigation Bar (Mobile / Tablet only)

```
┌───────────────────────────────────────────────────┐
│  [🏠]    [🏸 •3]   [📋]    [👤]    [🔔]           │
│  Home   Clubs    Sessions Profile  Notif           │
└───────────────────────────────────────────────────┘
```

### Tabs

| # | Label | Icon | Route | Badge |
|---|-------|------|-------|-------|
| 1 | Home | house | `/home` | — |
| 2 | Clubs | shield | `/clubs` | **Pending requests count** (amber `color-warning`) |
| 3 | Sessions | calendar | `/sessions` | — |
| 4 | Profile | user-circle | `/profile` | — |
| 5 | Notif | bell | `/notifications` | Unread count (red `color-error`) |

### Badge Differences vs Player

**Clubs tab badge:**
- Background: `color-warning` (amber — distinguishes from notification red)
- Text: white, `text-micro`
- Shows total pending join requests across all clubs the user owns
- Hidden when count is 0
- Max display: `99+`

### Tab Item Spec (unchanged from Player)
- Icon: 20px stroke, centered
- Label: `text-micro` (10px, Medium 500), below icon
- **Active:** icon + label in `color-accent`; 2px top border in `color-accent`
- **Inactive:** icon + label in `color-text-disabled`

---

## 4. Contextual States

### Pending Requests — Badge Behavior

| Pending count | Clubs tab badge | Desktop pending chip |
|---------------|----------------|---------------------|
| 0 | Hidden | Hidden |
| 1–9 | Shows count | `[N] pending` |
| 10–99 | Shows count | `[N] pending` |
| 100+ | `99+` | `99+ pending` |

### Active Session as Player (concurrent role state)
A Club Owner can also be a player registered in a session. If they are currently in an active session:
- Same live session banner behavior as Player (see `home.md`)
- No change to the navbar itself

### Club Owner Hub Active State
When navigating within `/clubs/:id/manage`:
- **Mobile bottom nav:** Clubs tab remains active (highlighted in `color-accent`)
- **Desktop top bar:** Back arrow present + management breadcrumb in title

---

## 5. Design Tokens

| Token | Usage |
|-------|-------|
| `color-bg-base` | Top header bar background |
| `color-bg-surface` | Bottom nav bar background |
| `color-border` | Bar borders |
| `color-accent` | Active tab icon + label + top border |
| `color-warning` | Pending requests badge (Clubs tab), pending chip |
| `color-warning-subtle` | Pending chip background |
| `color-text-primary` | Wordmark, page title |
| `color-text-disabled` | Inactive tab icon + label |
| `color-error` | Notification bell badge |
| `text-title` 22px SemiBold | Wordmark, greeting |
| `text-heading` 18px SemiBold | Inner page title (mobile/tablet) |
| `text-small` 13px | Pending chip label |
| `text-micro` 10px Medium | Tab labels, badge counts |
