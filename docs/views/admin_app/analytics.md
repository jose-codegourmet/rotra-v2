# View: Platform Analytics

## Purpose

The platform analytics view is the read-only health and growth intelligence layer for the Admin App. It gives the platform team a live pulse on what is happening across the ROTRA ecosystem: how many sessions are running right now, how the player base is growing, whether features are being adopted, and whether the platform is trending toward its engagement targets.

No data can be modified from this view. All metrics are read-only. Actions that modify data (moderation, config changes) are accessible via their own dedicated views, but this view links to them where the data suggests attention is needed.

## Route

`/admin/analytics` — authenticated admins only

## Roles

Platform Admin, Super Admin. Identical access for both roles.

---

## Layout

A persistent real-time health strip spans the full width below the page header. Below it, a global time-range picker and export controls sit in a toolbar. The main content area uses tabs to separate metric categories. Each tab renders a grid of metric cards and tables.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR (240px)    │  ● PRODUCTION                              Admin ▾   │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard      │  Platform Analytics                                  │
│  ...                │  ─────────────────────────────────────────────────   │
│  [▪] Analytics   ←  │                                                      │
│                     │  ── Real-Time Health ──────────────────────────────  │
│                     │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│                     │  │Active  │ │Connect │ │Error   │ │Queue   │        │
│                     │  │Sessions│ │  Users │ │  Rate  │ │ Depth  │        │
│                     │  │  14  ● │ │  87  ● │ │ 0.2% ● │ │  3   ●│        │
│                     │  └────────┘ └────────┘ └────────┘ └────────┘        │
│                     │  Last updated: 09:41:05 UTC  [ ↺ Refresh ]          │
│                     │                                                      │
│                     │  [ Last 30 days ▾ ]     [ Export CSV ] [Export PDF ] │
│                     │                                                      │
│                     │  [ Growth ] [ Engagement ] [ Feature Adoption ]      │
│                     │  [ Financial Signals ] [ Moderation Health ]         │
│                     │  ═══════                                             │
│                     │                                                      │
│                     │  TAB CONTENT                                         │
│                     │                                                      │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## Components

### Real-Time Health Strip

Full-width panel directly below the page header; visually distinct from the tabbed metric content.

- Background: `color-bg-surface`; border-bottom: 1px `color-border`; `space-5` padding
- **Section label:** `"Real-Time Health"` — `text-small`, uppercase, `color-text-disabled`
- **Four metric cards** in a 4-column grid, `space-3` gap:
  - Each card: `color-bg-elevated` bg, `radius-md`, `space-4` padding
  - Metric label: `text-small`, `color-text-secondary`, uppercase
  - Metric value: `text-display` (28px, Bold), `color-text-primary`
  - Status indicator: 8px circle + status label — `GREEN` = `color-accent`, `AMBER` = `color-warning`, `RED` = `color-error`
  - Metrics: Active Sessions · Connected Users · Error Rate (%) · Queue Depth
- **Last updated line:** `text-micro`, `color-text-disabled` — `"Last updated: [HH:MM:SS UTC]"`
- **Refresh button:** `[ ↺ Refresh ]` — `text-small`, `color-accent`; manual refresh; auto-refresh every 15 seconds (subtle spinner in the icon during a refresh cycle)
- **Status thresholds:**
  - Error Rate: GREEN < 1%, AMBER 1–5%, RED > 5%
  - Queue Depth: GREEN < 50, AMBER 50–200, RED > 200
  - Active Sessions and Connected Users: always GREEN unless the WebSocket feed is disconnected; disconnected = `color-error` with `"Feed offline"` replacing the value

### Time Range Picker

Positioned in the toolbar between the health strip and the tab bar.

- Left side: dropdown `[ Last 30 days ▾ ]` — same dropdown spec (40px height, `color-bg-elevated`, `radius-md`)
  - Options: `Last 7 days` · `Last 30 days` · `Last 90 days` · `Last 6 months` · `Last 1 year` · `All time` · `Custom…`
  - Selecting `Custom…` opens an inline date-range picker: two `date` inputs (`From:` and `To:`) side by side, same input styling; updates all tab metrics on confirm
- Default: `Last 30 days`
- Changing the range re-fetches all tab data; a subtle loading skeleton replaces metric values during fetch

### Export Controls

Right side of the toolbar row, aligned to the right edge of the content area.

- `[ Export CSV ]` — `color-bg-elevated`, `color-text-primary`, `radius-md`, 36px height; downloads a CSV of all metrics for the current tab and time range
- `[ Export PDF ]` — same styling; generates a formatted PDF snapshot of the current dashboard view (all tabs, current time range)
- Both buttons trigger a brief loading state (spinner in button) while the export generates

---

## Tab 1: Growth

Key growth and acquisition metrics for the platform.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Growth  ·  Last 30 days                                                     │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐   │
│  │ New Registrations   │  │ New Clubs Created   │  │ Player Churn       │   │
│  │ 312                 │  │ 8                   │  │ 4.2%               │   │
│  │ ▲ +12% vs prev 30d  │  │ ▲ +3 vs prev 30d    │  │ ▼ -0.8pp vs prev   │   │
│  └─────────────────────┘  └─────────────────────┘  └────────────────────┘   │
│  ┌─────────────────────┐  ┌─────────────────────┐                           │
│  │ Returning Players   │  │ Club Owner Apps     │                           │
│  │ 68%                 │  │ 14 submitted         │                           │
│  │ ▲ +2pp vs prev      │  │ 11 approved / 3 rej  │                           │
│  └─────────────────────┘  └─────────────────────┘                           │
│                                                                              │
│  ── New Registrations Over Time ─────────────────────────────────────────   │
│  [  LINE CHART — daily/weekly/monthly granularity toggle  ]                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Summary Cards

Each metric card:
- Background: `color-bg-surface`; border: 1px `color-border`; `radius-lg`; `space-5` padding
- **Metric label:** `text-small`, uppercase, `color-text-disabled`
- **Primary value:** `text-display` (28px, Bold), `color-text-primary`
- **Trend indicator:** small arrow + percentage/absolute delta vs. previous equivalent period
  - Positive delta (growth): `▲` + `color-accent` text
  - Negative delta (decline): `▼` + `color-error` text
  - Neutral / no prior data: `—` + `color-text-disabled`
- **Sub-line (where applicable):** `text-small`, `color-text-secondary` — e.g. approval counts, breakdown by join method

**Growth Metrics Cards:**

| Metric | Primary Value | Trend | Sub-line |
|---|---|---|---|
| New Registrations | count | % change | Breakdown: Facebook only (for now) |
| New Clubs Created | count | absolute delta | — |
| Player Churn | % | pp change | `"% of players with no activity in last 60 days"` |
| Returning Players | % | pp change | `"% active this week who were active last week"` |
| Club applications | count submitted | — | `"[N] approved / [N] rejected"` |

Cards arranged in a responsive grid: 3 across, then 2, wrapping to fill.

### New Registrations Over Time Chart

- Full-width chart panel below the cards; `color-bg-surface` bg; `radius-lg`; `space-5` padding
- Chart type: area line chart with a subtle `color-accent` fill below the line
- X-axis: time (granularity based on range — daily for < 30d, weekly for < 90d, monthly otherwise)
- Y-axis: registration count
- Granularity toggle: `[ Daily ] [ Weekly ] [ Monthly ]` — small pill toggle above the chart, right-aligned; `color-bg-elevated` background for inactive, `color-accent-subtle` for active
- Hover tooltip: exact date + count + formatted delta vs. same period
- Chart renders using a lightweight JS charting library; axes use `color-text-disabled` labels; grid lines use `color-border`

---

## Tab 2: Engagement

Session volume, queue behaviour, and review completion.

**Metric Cards (arranged 3-across):**

| Metric | Primary Value | Sub-line |
|---|---|---|
| Sessions Created | count | — |
| Sessions per Active Club / Month | median | Target: ≥ 4; amber if < 4, green if ≥ 4 |
| Queue Registration Rate | % avg | `"% of session attendees who registered in-app"` · Target: ≥ 80% |
| Match Review Completion Rate | % avg | `"% of matches with at least 1 review submitted"` · Target: ≥ 60% |
| Que Master Session Setup Time | median minutes | `"Median time from session creation to first player join"` · Target: < 5 min |
| Avg Waitlisted Response Time | median minutes | `"Median time between promotion and response"` · Target: < 10 min |

Cards use the same spec as Growth tab. Target-based metrics include a subtle progress bar below the primary value:
- Progress bar: full-width within the card, 4px height, `radius-full`
- Fill colour: `color-accent` when at or above target; `color-warning` when 70–99% of target; `color-error` when below 70%
- Below-bar label: `"Target: [N]"` — `text-micro`, `color-text-disabled`

**Sessions Over Time Chart:** same area chart spec; plots session creation count over the selected time range.

---

## Tab 3: Feature Adoption

How actively platform features are being used beyond the core session flow.

**Metric Cards:**

| Metric | Primary Value | Sub-line |
|---|---|---|
| Sessions with Umpire | % of sessions | `"Sessions where ≥ 1 Quick Umpire token was used"` |
| Reviews per Match | avg count | — |
| Skill Ratings per Match | avg count | — |
| Gear Items per Player | avg count | — |
| Sharing Actions | total count | `"Match, profile, and leaderboard share taps"` |
| Leaderboard Views | total count | `"Club + global leaderboard page loads"` |

Cards: same spec; no target-based progress bars here (adoption metrics are observation-only, not against a hard target unless the team sets one).

**Feature Adoption Over Time Chart:** multi-line chart; each feature is a separate line; toggle checkboxes above the chart to show/hide individual features. Line colours assigned deterministically per feature using a fixed palette from ROTRA's secondary token set.

---

## Tab 4: Financial Signals

> These are signals only, not accounting. Tax, overhead, and withdrawals are not tracked here.

**Metric Cards:**

| Metric | Primary Value | Sub-line |
|---|---|---|
| Sessions with Cost Tracking | % | `"Sessions using the platform cost system"` |
| Total Markup Collected | currency amount | `"Sum of markup across all sessions in range"` |
| Avg Markup per Session | currency amount | `"Mean markup where markup > 0"` |
| Payment Completion Rate | % | `"% of session players marked as Paid by session close"` |

- Currency values: displayed in the platform's configured currency; formatted with thousands separators
- A persistent banner at the top of this tab: `"Financial Signals is informational only. These figures are not accounting records and should not be used for tax or financial reporting."` — `color-bg-elevated` background, `color-text-secondary` text, `text-small`, `radius-md`, `space-4` padding

**Markup Over Time Chart:** area chart of total markup per day/week/month.

---

## Tab 5: Moderation Health

Queue health and content safety metrics.

**Metric Cards:**

| Metric | Primary Value | Sub-line |
|---|---|---|
| Flagged Reviews (Pending) | count | Links to `/admin/moderation` |
| Flagged Reviews Resolved | count | `"In the selected time range"` |
| Avg Review Resolution Time | duration | `"Time from flagged to actioned"` |
| Active Suspensions | count | `"Currently suspended accounts"` |
| Club applications pending | count | Links to `/admin/approvals/club-applications` |

- Metric cards that link to other views show a `"→ Go to [view]"` text link below the primary value, `text-small`, `color-accent`
- Pending counts with values > 0 show `color-warning` left inset bar on the card

**Moderation Activity Over Time Chart:** bar chart of flagged reviews and resolutions per day/week/month; two bars per interval (flagged = `color-warning`, resolved = `color-accent`).

---

## States

### Loading (time range change or initial load)
All metric cards display a skeleton placeholder: grey pulse bars replacing the value and sub-line. Charts show a loading spinner centered in the chart area. The time range picker is non-interactive during load.

### WebSocket Feed Offline
Real-time health strip shows `"Feed offline"` in place of Active Sessions and Connected Users values; `color-error` text. A banner below the strip: `"Real-time data unavailable. Last known values shown."` — `color-error-subtle` bg, `color-error` text. Tabbed metrics continue to load from the API (they are not real-time).

### No Data for Time Range
If a selected custom date range returns no data, metric cards show `"—"` for all values (`color-text-disabled`) and charts show an empty-state illustration with `"No data for this time range."` — `text-body`, `color-text-secondary`.

### Export In Progress
The clicked export button shows a loading spinner. A small toast appears: `"Preparing export…"` — auto-updates to `"Export ready. Download started."` when complete.

### Alert Banner (health metric critical)
If any real-time metric enters RED status, a non-dismissable banner appears directly below the health strip and above the toolbar: `"⚠ Platform alert: [metric] is critical. Monitor closely."` — `color-error` background, white text. Persists until the metric returns to GREEN.

---

## Responsive Layout

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Full layout as described; metric cards 3-across |
| Desktop (compact) | 1024px–1279px | Metric cards 2-across; charts remain full-width within tab |
| Tablet | 768px–1023px | Sidebar hidden; metric cards single-column; real-time strip collapses to 2-column |
| Mobile | < 768px | Not supported |

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-surface` | Metric cards, chart panels, tab content |
| `color-bg-elevated` | Real-time health card backgrounds, dropdown, inactive granularity pills |
| `color-border` | Card borders, chart grid lines, row separators |
| `color-accent` | GREEN health status, positive trend, target-met fill, active granularity pill, export buttons, chart line colours |
| `color-accent-subtle` | Active granularity pill background, chart area fill |
| `color-warning` | AMBER health status, below-target progress bar, pending card inset bars, flagged review bars |
| `color-error` | RED health status, negative trend, below-70%-target fill, critical banner |
| `color-error-subtle` | Feed offline / critical banner background |
| `color-text-primary` | Metric values, chart axis labels |
| `color-text-secondary` | Metric sub-lines, chart tooltips, financial disclaimer |
| `color-text-disabled` | Metric labels (uppercase), chart grid labels, trend neutral state |
| `radius-lg` 14px | Metric cards, chart panels |
| `radius-md` 10px | Real-time health cards, dropdown, export buttons |
| `radius-full` | Progress bars |
| `text-display` 28px Bold | Primary metric values, real-time strip values |
| `text-small` 13px | Tab metric labels, sub-lines, chart toggle labels |
| `text-micro` 10px | Progress bar target labels, export toast copy |
