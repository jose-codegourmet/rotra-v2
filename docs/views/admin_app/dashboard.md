# View: Admin Dashboard

## Purpose

The post-login landing page and primary command centre for the platform team. The dashboard surfaces the most actionable information first: real-time platform health, counts of items requiring immediate attention (pending approvals, pending moderation, open incidents), and quick navigation into every major Admin App section.

The dashboard is intentionally read-oriented — most data here is display-only. Actionable items (approvals, flags) link out to their dedicated views rather than being resolved inline. The one exception is emergency kill-switch access, which can be triggered directly from the dashboard for speed during incidents.

## Route

`/admin/dashboard` — authenticated admins only. This is the default redirect after login and the default fallback for unknown routes.

## Roles

Platform Admin, Super Admin. Content is identical for both; Super Admin-exclusive actions are called out where relevant.

---

## Layout

Three-region shell: persistent left sidebar, narrow top environment bar, scrollable main content area. The main content area uses a structured grid — not a single-column feed.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│                     │  ● PRODUCTION                              Admin ▾   │
│  SIDEBAR  (240px)   ├──────────────────────────────────────────────────────┤
│                     │  PAGE HEADER                                         │
│  ROTRA Admin        │  Dashboard                       Mar 30, 2026 09:41  │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard  ←   │                                                      │
│  [▪] Kill Switches  │  ── Platform Health (live) ───────────────────────   │
│  [▪] Environments   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  [▪] Approvals   3  │  │ Active   │ │Connected │ │Error     │ │Queue   │  │
│  [▪] Moderation  2  │  │ Sessions │ │ Users    │ │ Rate     │ │ Depth  │  │
│  [▪] Users          │  │  ● 14    │ │  ● 87    │ │  ● 0.2%  │ │  ● 3   │  │
│  [▪] Admins         │  │  GREEN   │ │  GREEN   │ │  GREEN   │ │ GREEN  │  │
│  [▪] Platform       │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│       Config        │                                                      │
│  [▪] Analytics      │                                                      │
│                     │                                                      │
│  ───────────────    │  ── Attention Required ────────────────────────────  │
│  Jose B.            │  ┌──────────────────────────┐ ┌────────────────────┐ │
│  Super Admin        │  │ Pending Approvals      3 │ │ Flagged Reviews  2 │ │
│  [ Logout ]         │  │ Oldest: 2 days ago       │ │ Oldest: 5 hrs ago  │ │
│                     │  │ [ Review Applications → ]│ │ [ Go to Queue →  ] │ │
│                     │  └──────────────────────────┘ └────────────────────┘ │
│                     │  ┌──────────────────────────┐ ┌────────────────────┐ │
│                     │  │ Active Suspensions     1 │ │ Kill Switches OFF 0│ │
│                     │  │ 1 permanent, 0 temp      │ │ All features ON    │ │
│                     │  │ [ View Accounts →      ] │ │ [ Kill Switches →] │ │
│                     │  └──────────────────────────┘ └────────────────────┘ │
│                     │                                                      │
│                     │  ── Quick Navigation ──────────────────────────────  │
│                     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│                     │  │  Kill    │ │ Environ- │ │ Platform │ │ Analy- │  │
│                     │  │Switches  │ │  ments   │ │  Config  │ │  tics  │  │
│                     │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│                     │                                                      │
│                     │  ── Recent Audit Activity ─────────────────────────  │
│                     │  [ table of last 10 audit log entries ]              │
│                     │                           [ View Full Audit Log → ]  │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## Components

### Left Sidebar

Shared shell component present on all authenticated Admin App views.

- Width: 240px, fixed, full viewport height
- Background: `color-bg-surface`
- Right border: 1px solid `color-border`
- **Wordmark block:** `space-6` (24px) all-sides padding
  - `ROTRA Admin` — `text-title` (20px, SemiBold), `color-text-primary`, letter-spacing -0.5px
- **Navigation items:** 48px height rows, `space-4` horizontal padding
  - Icon: 18px stroke, left-aligned
  - Label: `text-body` (15px), `color-text-secondary`
  - Active item: `color-text-primary` label + `color-accent` icon, `color-accent-subtle` background, `radius-md`
  - Hover: `color-bg-elevated` background, `radius-md`
  - Badge (attention count): right-aligned pill — `color-warning` background, white `text-micro`, shows count of items requiring attention (`Approvals` shows pending count, `Moderation` shows pending flag count)
- **Nav items (top to bottom):** Dashboard · Kill Switches · Environments · Approvals · Moderation · Users · Admins · Platform Config · Analytics
  - **Users** — player directory (`admin_role IS NULL` lens); see [`./users.md`](./users.md)
  - **Admins** — platform team management (Super Admin only mutates); see [`./admins.md`](./admins.md)
- **Bottom divider:** 1px `color-border`
- **User row:** `space-4` padding, flex row
  - Avatar: 32×32px circle, initials-based (`color-accent-subtle` bg, `color-accent` text), `radius-full`
  - Name: `text-small` (13px, Medium), `color-text-primary`
  - Role: `text-micro` (10px), `color-text-secondary` (e.g. `Super Admin`)
  - Logout: `text-small`, `color-text-secondary`, underline on hover, `space-2` top margin — triggers session termination and redirects to `/admin/login`

### Environment Bar

Shared shell component present on all authenticated Admin App views.

- Height: 36px, full width above the page content (margin-left: 240px to clear sidebar)
- Background and text vary by environment:
  - `prod`: `color-error` background (`#FF3B30`), white text — `● PRODUCTION`
  - `staging`: `color-warning` background (`#FFB800`), dark text — `◐ STAGING`
  - `dev`: `color-bg-elevated` background, `color-text-secondary` text — `○ DEVELOPMENT`
- Left: filled circle icon (8px) + environment label — `text-label` (12px, uppercase, Medium)
- Right: logged-in admin name + dropdown caret (account menu: [Profile](./profile.md), Change Password, Logout)
- The environment label is non-interactive (display only)
- On `prod`: all save/toggle actions throughout the app trigger an additional confirmation dialog that re-states "You are modifying PRODUCTION"

### Page Header

- Full-width row below the environment bar, `space-6` (24px) horizontal padding, `space-5` (20px) vertical padding
- Border-bottom: 1px `color-border`
- Left: page title `Dashboard` — `text-title` (20px, SemiBold), `color-text-primary`
- Right: current date + time — `text-small`, `color-text-secondary` (e.g. `Mar 30, 2026 09:41`) — auto-refreshes every minute

### Platform Health Strip (real-time)

Four metric cards in a 4-column equal-width grid, `space-4` gap.

Each health card:
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg` (14px)
- Padding: `space-5` (20px)
- **Metric label:** `text-small` (13px, Regular), `color-text-secondary`, uppercase
- **Metric value:** `text-display` (28px, Bold), `color-text-primary`
- **Status indicator:** 8px filled circle + status label (`text-micro`, uppercase) — color varies:
  - `GREEN` — `color-accent`
  - `AMBER` — `color-warning`
  - `RED` — `color-error`
- Status thresholds per metric:
  - Active Sessions: always GREEN unless WebSocket feed disconnects
  - Connected Users: always GREEN unless feed disconnects
  - Error Rate: GREEN < 1%, AMBER 1–5%, RED > 5%
  - Queue Depth: GREEN < 50, AMBER 50–200, RED > 200
- Values poll every 15 seconds via the platform health API; a subtle fade-in animates updated values
- Clicking any health card navigates to the full Analytics view with the relevant metric pre-selected

### Attention Required — 2×2 Grid

Four summary tiles arranged in a 2-column grid, `space-4` gap.

Each attention tile:
- Background: `color-bg-surface`
- Border: 1px solid `color-border`; if count > 0, border becomes 1px solid `color-warning` for non-zero pending items
- Border radius: `radius-lg`
- Padding: `space-5`
- **Title + count:** flex row — title (`text-body`, Medium, `color-text-primary`) + count badge (large pill, `color-warning` bg, white `text-body`, Bold) — count badge hidden if count is 0, replaced with `✓ All clear` (`text-small`, `color-accent`)
- **Subtext:** `text-small`, `color-text-secondary` — contextual detail (e.g. `"Oldest: 2 days ago"`)
- **CTA link:** `text-small`, `color-accent`, underline on hover — navigates to the relevant section
- Tiles:
  1. **Pending Approvals** — count of Club Owner applications with status `Pending`; subtext shows oldest submission age; CTA → `/admin/approvals`
  2. **Flagged Reviews** — count of reviews with status `Pending` in the moderation queue; CTA → `/admin/moderation`
  3. **Active Suspensions** — count of currently suspended accounts; subtext shows permanent vs. temporary breakdown; CTA → `/admin/moderation?tab=accounts`
  4. **Kill Switches OFF** — count of features currently toggled OFF; subtext `"All features ON"` when count is 0; CTA → `/admin/kill-switches`

### Quick Navigation — 4-Column Icon Grid

Four shortcut tiles in a single row.

Each nav tile:
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg`
- Padding: `space-5`
- Center-aligned: icon (28px stroke, `color-accent`) + label (`text-small`, `color-text-primary`) stacked vertically, `space-2` gap
- Hover: `color-bg-elevated` background, subtle `shadow-card`
- Tiles: Kill Switches · Environments · Platform Config · Analytics

### Recent Audit Activity Table

Displays the 10 most recent audit log entries across the entire Admin App.

- Section header: `Recent Audit Activity` — `text-small`, `color-text-secondary`, uppercase
- Table container: `color-bg-surface` background, `radius-lg`, `color-border` border, `space-5` padding
- Table: full-width, no outer border (uses row separators only)
- **Columns:**
  - `Time` — `text-small`, `color-text-secondary`; relative time (`"2 min ago"`, `"1 hr ago"`) with full timestamp on hover
  - `Admin` — `text-small`, `color-text-primary`; admin account name
  - `Action` — `text-body`, `color-text-primary`; human-readable action string (e.g. `"Kill switch toggled OFF: sessions.creation"`, `"Club Owner application approved: player_id=xxx"`)
  - `Environment` — pill badge: `prod` = `color-error-subtle` bg + `color-error` text; `staging` = `color-warning-subtle` + dark; `dev` = `color-bg-elevated` + `color-text-secondary`
- Row height: 48px; row separator: 1px `color-border`; header row: `text-micro` uppercase, `color-text-disabled`
- Hover state: row background → `color-bg-elevated`
- **"View Full Audit Log →"** link — right-aligned below the table, `text-small`, `color-accent`; navigates to the full audit log page

---

## States

### All Systems Nominal
All four health cards show GREEN. All attention tile counts are zero. Kill Switches OFF tile shows `✓ All clear`. Audit log shows recent routine activity.

### Pending Items Exist
Relevant attention tiles show orange borders and non-zero counts. Sidebar nav badges reflect the same counts. No alert or sound — purely visual.

### One or More Health Metrics in AMBER or RED
The affected health card's status indicator changes colour. If any metric is RED, a non-dismissable alert banner appears directly below the page header: `⚠ Platform alert: [metric name] is in a critical state. Check Analytics for details.` — `color-error` background, white text, `text-body`. The banner persists until the metric returns to GREEN.

### Kill Switch Incident Active
The Kill Switches OFF tile count increments. Sidebar badge on `Kill Switches` updates. No other dashboard-level indication beyond the count.

### Session Expired / Connection Lost
If the admin session expires (4 hours of inactivity) or the API becomes unreachable, health cards stop refreshing and display a `—` placeholder with `color-text-disabled`. A toast notification appears: `"Your session has expired. Please sign in again."` — auto-navigates to `/admin/login` after 5 seconds.

---

## Responsive Layout

The Admin App is desktop-first. The dashboard is designed for wide viewports.

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Full layout as described above |
| Desktop (compact) | 1024px–1279px | Sidebar collapses to 56px icon-only rail; health cards remain 4-column; attention grid remains 2×2 |
| Tablet | 768px–1023px | Sidebar hidden; replaced by a top hamburger menu; health cards collapse to 2-column grid; attention tiles stack to single column |
| Mobile | < 768px | Not supported — displays a notice: `"The Admin App requires a desktop browser."` |

### Compact Sidebar (1024px–1279px)

When the sidebar collapses to icon-only:
- Width reduces to 56px
- Labels are hidden; icons remain at 20px stroke
- Badges (attention counts) remain as dot indicators on icons
- Hovering an icon shows a tooltip with the nav item label
- ROTRA Admin wordmark collapses to the `R` monogram

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-base` | Page background |
| `color-bg-surface` | Sidebar, cards, table container |
| `color-bg-elevated` | Hover states on nav items and table rows |
| `color-border` | Sidebar border, card borders, table row separators |
| `color-accent` | Active nav item icon, attention CTA links, quick nav icons, GREEN health status |
| `color-accent-subtle` | Active nav item background |
| `color-warning` | AMBER health status, attention tile borders and badges, staging environment bar |
| `color-error` | RED health status, platform alert banner, prod environment bar |
| `color-text-primary` | Page title, metric values, action strings |
| `color-text-secondary` | Sidebar labels, subtext, timestamp |
| `color-text-disabled` | Audit log column headers |
| `shadow-card` | Quick nav tile hover |
| `shadow-modal` | Not used on dashboard |
| `radius-lg` 14px | Health cards, attention tiles, nav tiles, table container |
| `radius-md` 10px | Active nav item background |
| `text-display` 28px Bold | Health metric values |
| `text-title` 20px SemiBold | Page title, wordmark |
| `text-body` 15px | Nav labels, attention tile titles, action strings |
| `text-small` 13px | Section headers, subtext, table cells |
| `text-micro` 10px | Badge counts, table column headers, status labels |
