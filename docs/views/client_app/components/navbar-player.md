# Component: Navbar — Player

## Purpose
The top navigation bar for the **Player** role. On desktop (≥1024px) this is the in-page content header (wordmark + contextual page title + notifications); on tablet and mobile it doubles as the app shell top bar. The bottom navigation bar (mobile/tablet only) is also documented here.

> **Client v1 (implemented):** Desktop bell opens a **dropdown** with the **5 most recent** notifications and **View all** → `/notifications`. The mobile header bell **deep-links** to `/notifications` (no dropdown). Full inbox spec and v1 scope: [`../common/notification_center.md`](../common/notification_center.md) (see **Implementation status (Client app v1)**).

> **Desktop-first note:** The sidebar (`sidebar-player.md`) is the primary navigation surface at ≥1024px. This navbar surfaces only in the main content area as a slim page-level bar.

## Roles
**Player** — standard authenticated user with no management privileges.

---

## 1. Desktop Top Bar (≥ 1024px)

Sits flush to the top of the main content area, to the right of the sidebar. Not fixed/sticky — scrolls with page content on inner views, but sticky on list/dashboard views.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Page Title]     │  [subtitle]     [theme] [🔔] [search] [avatar ▾]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Spec
- **Height:** 64px (`h-16`)
- **Position:** Fixed top-right of main content area (`w-[calc(100%-256px)]`), `z-40`
- **Background:** `color-bg-surface` at 80% opacity with backdrop blur; **border-bottom:** 1px `color-border`
- **Left:** Breadcrumb-style title row
  - Primary segment: page title — `text-label`, bold, uppercase, tracking-widest, `color-accent`
  - Divider: 1px vertical `color-border-strong`
  - Secondary segment: subtitle (default `ROTRA`) — same typography, `color-text-secondary`
- **Right (left to right):**
  - **Theme toggle** — light/dark/system
  - **Notifications dropdown** — bell with unread badge; 5 most recent + **View all** → `/notifications`
  - **Search** — icon button (placeholder; no route yet)
  - **Avatar menu** — 36×36px circular trigger (`border-2` `color-accent`); profile image or user icon fallback

#### Avatar dropdown menu

Opened from the avatar trigger (`align="end"`, min-width ~12rem).

- **Header row:** signed-in display name (`profiles.name` with auth metadata fallback), truncated
- **View profile** → `/profile` (admin) or `/profile/:id` (player)
- **Account settings** → `/settings/account` (see [`../common/account_settings.md`](../common/account_settings.md))
- **Log out** — destructive styling; opens logout confirmation dialog

> Account settings is not a per-route navbar icon; it is always available from this dropdown on desktop (≥1024px).

### Page-Specific Variations

| Route | Left content | Right content |
|-------|-------------|---------------|
| `/home` | Page title + subtitle | Theme, 🔔, search, avatar menu |
| `/clubs` | `Clubs` + subtitle | Theme, 🔔, search, avatar menu |
| `/sessions` | `Sessions` + subtitle | Theme, 🔔, search, avatar menu |
| `/profile` | `Profile` + subtitle | Theme, 🔔, search, avatar menu |
| `/settings/account` | `Account` + subtitle | Theme, 🔔, search, avatar menu |
| `/notifications` | `Notifications` + subtitle | Theme, avatar menu (no search on some views) |
| Inner page (e.g. `/clubs/:id`) | `← [Back label]` + `[Club name]` | Contextual actions or avatar menu |

---

## 2. Mobile / Tablet Top Header Bar (< 1024px)

The persistent app shell header shown on all screens at smaller breakpoints.

```
┌──────────────────────────────────────┐
│  ROTRA                      [🔔  3]  │
└──────────────────────────────────────┘
```

### Spec
- **Height:** 56px
- **Background:** `color-bg-base`
- **Border-bottom:** 1px solid `color-border`
- **Left:** `ROTRA` wordmark — `text-title` (22px, SemiBold), `color-text-primary`, letter-spacing -0.5px
- **Right:** Notification bell with unread badge (same spec as desktop)

### Inner Page Variant (back navigation present)

```
┌──────────────────────────────────────┐
│  ← Back          [Page Title]        │
└──────────────────────────────────────┘
```

- **Left:** Back arrow (chevron-left, 24px, `color-text-primary`) + `Back` label (optional, `text-small`)
- **Center:** Page title — `text-heading` (18px, SemiBold), `color-text-primary`
- **Right:** Contextual action icon (e.g. ⚙ on Profile, ⓘ on Session view) or empty

---

## 3. Bottom Navigation Bar (Mobile / Tablet only)

Hidden at ≥1024px — replaced by the left sidebar. Rendered at the very bottom of the viewport, above the safe area inset.

```
┌──────────────────────────────────────────┐
│  [🏠]    [🏸]    [📋]    [👤]    [🔔]   │
│  Home   Clubs  Sessions Profile  Notif   │
└──────────────────────────────────────────┘
```

### Spec
- **Height:** 64px + iOS/Android safe area bottom inset
- **Background:** `color-bg-surface`
- **Border-top:** 1px solid `color-border`
- **Shadow:** subtle upward `shadow-card`
- **Tab count:** 5 tabs — equal width, full stretch

### Tabs

| # | Label | Icon | Route | Badge |
|---|-------|------|-------|-------|
| 1 | Home | house | `/home` | — |
| 2 | Clubs | shield | `/clubs` | — |
| 3 | Sessions | calendar | `/sessions` | — |
| 4 | Profile | user-circle | `/profile` | — |
| 5 | Notif | bell | `/notifications` | Unread count |

### Tab Item Spec
- Icon: 20px stroke, centered
- Label: `text-micro` (10px, Medium 500), below icon, 2px gap
- **Active state:** icon + label in `color-accent`; 2px top border on icon in `color-accent`; no background fill
- **Inactive state:** icon + label in `color-text-disabled`
- **Notification badge:** small red pill on bell icon — `color-error` bg, white `text-micro`, min-width 16px
- Touch target: full tab cell (no minimum tap area restriction — full width/height of tab)

---

## 4. Contextual States

### Active Session Banner (conditional)
When the player is registered and active in an ongoing session, a banner appears:
- On **mobile/tablet**: between the top header and main content, not inside the navbar itself
- On **desktop**: inside the home page top bar area as a highlighted strip

```
┌────────────────────────────────────────────────────────┐
│  🟢 LIVE  ·  Sunrise Badminton Club  ·  Hall B          │  [VIEW SESSION →]
└────────────────────────────────────────────────────────┘
```

See `home.md` for full active session banner spec.

### No Active Session
Default state — no banner, no changes to navbar.

### Notification Bell — States
| State | Appearance |
|-------|-----------|
| 0 unread | Bell icon only, `color-text-primary` |
| 1–99 unread | Bell + red pill badge with count |
| 99+ unread | Bell + red pill badge showing `99+` |

---

## 5. Design Tokens

| Token | Usage |
|-------|-------|
| `color-bg-base` | Top header bar background |
| `color-bg-surface` | Bottom nav bar background |
| `color-border` | Bottom border on top bar, top border on bottom nav |
| `color-accent` | Active tab icon + label + top border |
| `color-text-primary` | Wordmark, page title, back arrow |
| `color-text-disabled` | Inactive tab icon + label |
| `color-error` | Notification badge background |
| `text-title` 22px SemiBold | Wordmark, greeting |
| `text-heading` 18px SemiBold | Inner page title (mobile/tablet) |
| `text-micro` 10px Medium | Tab labels, notification badge count |
| `shadow-card` | Bottom nav upward shadow |
