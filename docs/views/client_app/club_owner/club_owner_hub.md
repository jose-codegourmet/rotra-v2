# View: Club Owner Hub

## Purpose
The Club Owner's management panel for a specific club. Provides full control over membership, roles, join requests, club settings, financial and membership analytics, and the blacklist. This is only accessible to the Club Owner of that club.

## Route
`/clubs/:id/manage` — Club Owner only

## Roles
**Club Owner** of this specific club. Other roles see a 403 or are redirected to `/clubs/:id`.

---

## Layout
Full-screen page with a top header. Below it: 5 tabs — **Members**, **Requests**, **Statistics**, **Blacklist**, **Settings**. Tab content area is scrollable. No bottom navigation bar replacement — standard bottom nav persists.

```
┌──────────────────────────────────────┐
│  ← Back     Sunrise BC — Manage      │  ← Header bar
├──────────────────────────────────────┤
│  Members │ Requests │ Stats │ Settings │  ← Tab bar (horizontal scroll if needed)
├──────────────────────────────────────┤
│                                      │
│  [Active tab content renders here]   │
│                                      │
└──────────────────────────────────────┘
│  [Home] [Clubs] [Sessions] [Profile] [🔔] │
```

### Tab Bar
- Horizontal tab row, full-width
- Background: `color-bg-surface`, border-bottom: 1px solid `color-border`
- Tab height: 48px
- Active tab: `text-label` uppercase, `color-accent`, bottom border 2px `color-accent`
- Inactive tab: `text-label` uppercase, `color-text-disabled`
- Tabs: **MEMBERS** · **REQUESTS** · **STATISTICS** · **SETTINGS**

---

## Tab 1: Members

Lists all active club members with their roles.

```
│  Search members...  [ 🔍 ]           │  ← Search input
│  24 active members                   │  ← Count, text-small
│                                      │
│  ┌─────────────────────────────────┐ │  ← Member row
│  │ [avatar]  Alex Santos           │ │  ← Name
│  │           Intermediate  ·  QM   │ │  ← Level · role badge
│  │           Joined Mar 2024   [›] │ │  ← Join date · chevron
│  └─────────────────────────────────┘ │
│  ...                                 │
│                                      │
│  [ ASSIGN QUE MASTER ]               │  ← Action button
```

### Member Row
- Height: 72px
- Layout: avatar (36×36px, `radius-full`) + name + metadata + chevron
- Name: `text-body` (15px), `color-text-primary`
- Level + role: `text-small`, `color-text-secondary`; role badge: `QM` pill — `color-accent-subtle` bg, `color-accent` text; `OWNER` pill — `color-bg-elevated`, `color-text-secondary`
- Joined date: `text-small`, `color-text-disabled`
- Tap row → expands or navigates to member action sheet

### Member Action (tap → bottom sheet or inline expand)
Options visible to Club Owner on any member (except themselves):
- **View Profile** → `/profile/:id`
- **Assign Que Master** (if not already QM) → triggers Assign QM modal
- **Revoke Que Master** (if already QM) → triggers Revoke QM confirm modal
- **Remove Member** → triggers Remove Member confirm modal
- **Blacklist Player** → triggers Blacklist confirm modal (only for removed or non-active members; if active, must remove first)

### Assign Que Master Button
- Positioned at bottom of tab content (sticky or below list)
- Secondary outline button, full-width: `ASSIGN QUE MASTER`
- Tap → opens Assign QM modal to pick multiple members at once

---

## Tab 2: Requests

Pending join requests queue. Sorted by submission date (oldest first).

```
│  3 pending requests                  │  ← Count with badge
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ [avatar]  Maria dela Cruz       │ │  ← Applicant name
│  │           Intermediate          │ │  ← Level
│  │           Requested Mar 28      │ │  ← Date
│  │  [ REJECT ]      [ APPROVE ]    │ │  ← Action buttons
│  └─────────────────────────────────┘ │
│  ...
```

### Request Card
- Background: `color-bg-surface`, border: 1px solid `color-border`, `radius-lg`
- Padding: `space-4`
- Applicant avatar + name: `text-heading`, `color-text-primary`
- Playing level: `text-small`, `color-text-secondary`
- Request date: `text-small`, `color-text-disabled`
- Tap avatar or name → `/profile/:id` (read-only view)
- Two action buttons (side by side, equal width, 40px height):
  - `REJECT` — destructive outline (`color-error` border + text)
  - `APPROVE` — primary (`color-accent`)
- Approve → triggers Approve Request modal (with optional note)
- Reject → triggers Reject Request modal (with optional note)

### Empty State
"No pending requests." — `text-body`, `color-text-secondary`, centered with `space-10` top padding

---

## Tab 3: Statistics

Two sub-tabs: **Membership** and **Financials**.

### Sub-tab: Membership

```
│  [ MEMBERSHIP ]  [ FINANCIALS ]      │  ← Sub-tab row (pill toggles or text tabs)
│                                      │
│  ┌──────────────────────────────┐    │  ← Stats card
│  │  New Members     12  Last 30d│    │
│  │  Consistent       8  ≥3 sess │    │
│  │  Via Invite Link  5  All time│    │
│  └──────────────────────────────┘    │
│  [ View Blacklist → ]                │  ← Link
│                                      │
│  [Time range: Last 30d ▾]            │  ← Time range selector
│                                      │
│  ── New Members Trend ────────────   │
│  [bar chart or line chart]           │
│                                      │
│  ── New Members List ─────────────   │  ← Drilldown (tap count to expand)
│  [member rows with join date]        │
```

**Stats Card rows:**
- Each row: label (`text-body`, `color-text-primary`) + count value (`text-title`, `color-accent`) + time range hint (`text-small`, `color-text-secondary`)
- Tap any count → expands drilldown section below with filtered member list

**Drilldown member list row:**
- Avatar + name + join date + join method (via link / via invite / via request) — `text-small`, `color-text-secondary`
- For Consistent Members: sessions attended + last session date

**Time Range Selector:**
- Compact dropdown pill: `Last 7d / Last 30d / Last 90d / Custom`
- `color-bg-elevated`, `radius-full`, `text-small`

### Sub-tab: Financials

```
│  [Time range: Last 30d ▾]            │  ← Time range selector
│                                      │
│  ┌──────────────────────────────┐    │  ← Summary card
│  │  Total Spent      ₱ 4,200   │    │
│  │  Total Collected  ₱ 3,800   │    │
│  │  Outstanding      ₱ 400     │    │  ← Color: color-error if > 0
│  │  Markup Profit    ₱ 600     │    │
│  │  Sessions         7         │    │
│  └──────────────────────────────┘    │
│                                      │
│  ── Per-Session Breakdown ────────   │
│  ┌────────────────────────────────┐  │  ← Session financial row
│  │  Mar 22 · Hall B               │  │
│  │  Court ₱800 · Shuttle ₱200     │  │
│  │  12 players · ₱120/player      │  │
│  │  Collected ₱1200 / Outstanding ₱240 │
│  └────────────────────────────────┘  │
```

**Summary card:** `color-bg-surface`, `radius-lg`, `shadow-card`, padding `space-6`
- Each metric: label (`text-small`, `color-text-secondary`) + value (`text-title`, `color-text-primary`)
- Outstanding value: `color-error` if > 0

**Per-session rows:** sortable by date (default: newest first), total cost, outstanding
- Tap row → expands per-player payment breakdown below

---

## Tab 4: Settings

```
│  Club Visibility                     │  ← Setting label
│  Public     ◉  /  Private  ○         │  ← Toggle/radio
│                                      │
│  Auto-Approve Join Requests          │  ← Toggle
│  [ ○ OFF ]                           │
│                                      │
│  Invite Link                         │  ← Label
│  [ ● ON  ]                           │  ← Toggle
│  https://rotra.app/join/abc123       │  ← Link preview, text-small
│  [ COPY LINK ]  [ ROTATE LINK ]      │  ← Action buttons
│                                      │
│  ─────────────────────────────────   │
│  Club Name        [ Edit ]           │
│  Description      [ Edit ]           │
│  Location         [ Edit ]           │
│                                      │
│  ─────────────────────────────────   │
│  Danger Zone                         │  ← text-label, color-error
│  [ PAUSE CLUB ]                      │  ← Destructive outline button
│  [ ARCHIVE CLUB ]                    │  ← Destructive outline button
```

**Toggle rows:**
- Each setting row: label (`text-body`, `color-text-primary`) + toggle switch (44px wide, `color-accent` when ON, `color-bg-elevated` when OFF) or radio group
- Row height: 56px, border-bottom: 1px solid `color-border`

**Invite Link block:**
- Link URL: `text-small`, `color-text-secondary`, truncated
- `COPY LINK` — secondary outline button (36px)
- `ROTATE LINK` — secondary outline button (36px); tap → Rotate Link confirm modal

**Edit inline blocks (Club Name, Description, Location):**
- Label left + `Edit` link right (`text-small`, `color-accent`)
- Tap `Edit` → Edit Club Details modal

---

## Modals

### Edit Club Details Modal
Triggered by tapping `Edit` next to Name, Description, or Location.

- Title: `Edit Club Details` — `text-title`, `color-text-primary`
- Fields: Club Name (text input), Description (textarea, 300 char max), Location (text input)
- Actions:
  - Primary: `SAVE CHANGES` — `color-accent`
  - Secondary: `Cancel` — outline

### Approve Join Request Modal
Triggered when Club Owner taps `APPROVE` on a request.

- Title: `Approve [Player Name]?` — `text-title`, `color-text-primary`
- Body: Player avatar + name + level + requested date
- Optional note field: `Add a welcome note (optional)` — text input, 150 char max
- Actions:
  - Primary: `APPROVE` — `color-accent`
  - Secondary: `Cancel` — outline

### Reject Join Request Modal
Triggered when Club Owner taps `REJECT`.

- Title: `Reject [Player Name]'s Request?` — `text-title`, `color-text-primary`
- Optional note field: `Reason (shown to player)` — textarea, 150 char max
- Actions:
  - Primary: `REJECT` — `color-error` border + text (destructive outline)
  - Secondary: `Cancel` — outline

### Remove Member Confirm Modal
- Title: `Remove [Player Name]?` — `text-title`, `color-text-primary`
- Body: `They will lose access to this club and all upcoming sessions.` — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `REMOVE` — destructive (`color-error` background)
  - Secondary: `Cancel` — outline

### Assign Que Master Modal
Triggered from the Members tab action or the sticky button.

- Title: `Assign Que Master` — `text-title`
- Searchable member list (same row format as Members tab)
- Checkbox multi-select per member
- Selected count badge: `X selected` — `color-accent` pill
- Actions:
  - Primary: `ASSIGN [X] QUE MASTER(S)` — `color-accent`, disabled if 0 selected
  - Secondary: `Cancel` — outline

### Revoke Que Master Confirm Modal
- Title: `Revoke Que Master role for [Name]?` — `text-title`
- Body: `They will immediately lose the ability to manage sessions in this club.` — `text-body`, `color-text-secondary`
- Actions:
  - Primary: `REVOKE` — destructive outline
  - Secondary: `Cancel` — outline

---

## Responsive Layout

### Breakpoints
| Breakpoint | Layout change |
|-----------|--------------|
| Mobile < 768px | Single column, horizontal tab scroll |
| Tablet 768–1023px | Single column, `max-width: 720px`, tabs fit without scroll |
| Desktop ≥ 1024px | Left sidebar nav + full-width panel with tab content expanded |

### Desktop (≥ 1024px)

The Club Owner Hub becomes a **master-detail / dashboard layout** on desktop:

```
┌────────────┬────────────────────────────────────────────────┐
│  Sidebar   │  Sunrise BC — Manage                           │
│            ├────────────────────────────────────────────────┤
│            │  MEMBERS │ REQUESTS │ STATISTICS │ SETTINGS    │
│            ├────────────────────────────────────────────────┤
│            │                                                │
│            │  [Tab content — full width, no inner scroll]   │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
```

**Members tab on desktop:**
- Becomes a proper **data table** with column headers: Name · Level · Role · Joined · Actions
- Table rows replace the mobile card list
- `ASSIGN QUE MASTER` button moves to top-right of the tab (above the table), as a standard button

**Requests tab on desktop:**
- Request cards become a **2-column grid** (if ≥ 2 pending; otherwise single column)

**Statistics tab on desktop:**
- **Membership** sub-tab: 3 stat cards in a row + chart occupies right side in a 40/60 split
- **Financials** sub-tab: Summary card on the left + per-session breakdown table on the right (2-column, 35/65 split)
- Time range selector moves to top-right of the content area

**Settings tab on desktop:**
- Settings render as a two-column form: label column (left, 200px) + input/control column (right)
- Danger zone section stays full-width at the bottom

**Modals on desktop:**
- All modals (Edit Club Details, Approve/Reject Request, Remove Member, Assign QM) render as centered overlays (`max-width: 520px`, vertically centered with backdrop)
- No bottom sheet behavior on desktop

### Tablet (768–1023px)
- Tab labels fit on one line (no horizontal scroll needed)
- Content at `max-width: 720px`
- Statistics use stacked sections (not side-by-side)

---

## Design Tokens
| Token | Usage |
|-------|-------|
| `color-bg-base` | Page background |
| `color-bg-surface` | Cards, modals |
| `color-bg-elevated` | Toggle off-state, time range selector |
| `color-accent` | Active tab, approve CTA, toggle on-state |
| `color-accent-subtle` | QM role badge |
| `color-error` | Reject/remove CTA, outstanding amounts |
| `color-text-primary` | Names, stat values |
| `color-text-secondary` | Labels, metadata |
| `color-text-disabled` | Dates, inactive tabs |
| `text-title` 22px SemiBold | Section headers, modal titles, stat values |
| `text-body` 15px | Member names, setting labels |
| `text-small` 13px | Metadata, labels |
| `text-label` 12px Medium | Tab labels |
| `radius-lg` 14px | Cards |
| `shadow-card` | Stats card, session rows |
