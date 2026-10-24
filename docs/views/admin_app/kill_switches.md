# View: Kill Switches

## Purpose

The kill switch registry is the primary safety tool for the platform team. It provides a single page where any platform feature can be toggled OFF instantly — without a code deploy or server restart. Switches are grouped by feature domain for fast scanning during incidents. Every toggle is permanent in audit history: state changes cannot be deleted or backdated.

This view is designed for speed under pressure. An admin responding to an incident should be able to locate and toggle the relevant switch within seconds, attach an incident note, and return to monitoring without navigating away.

## Route

`/admin/kill-switches` — authenticated admins only

## Roles

Platform Admin, Super Admin. Both roles can toggle any switch. All changes are logged immutably.

---

## Layout

Single content area below the shared shell (sidebar + environment bar). A full-width summary bar at the top shows the count of switches currently OFF. Below it, the registry is displayed as a collapsible grouped table. A narrow audit panel slides in from the right when a switch row is selected.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR (240px)    │  ● PRODUCTION                              Admin ▾   │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard      │  Kill Switches                  [ Emergency Guide ↗ ]│
│  [▪] Kill Switches← │  ─────────────────────────────────────────────────   │
│  ...                │  ● All features ON   (0 switches currently OFF)       │
│                     ├──────────────────────────────────────────────────────┤
│                     │                                                      │
│                     │  ▾ Authentication & Access    [ 2 switches ]         │
│                     │  ┌──────────────────────────────────────────────┐    │
│                     │  │ Key              │ Feature     │State│ Last  │    │
│                     │  │ auth.facebook... │ Facebook    │ ON  │ —     │    │
│                     │  │ auth.new_regist. │ New Regis.. │ ON  │ —     │    │
│                     │  └──────────────────────────────────────────────┘    │
│                     │                                                      │
│                     │  ▾ Club System    [ 4 switches ]                     │
│                     │  ┌──────────────────────────────────────────────┐    │
│                     │  │ ...rows...                                   │    │
│                     │  └──────────────────────────────────────────────┘    │
│                     │                                                      │
│                     │  ▾ Queue Sessions  [ 5 switches ]                    │
│                     │  ▾ Umpire App      [ 2 switches ]                    │
│                     │  ▾ Ratings & Reviews [ 3 switches ]                  │
│                     │  ▾ Gamification    [ 3 switches ]                    │
│                     │  ▾ Sharing & Social [ 2 switches ]                   │
│                     │  ▾ Tournaments     [ 1 switch — OFF by default ]     │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

When a switch row is clicked, an audit detail panel slides in from the right (320px wide), and the registry table shrinks accordingly:

```
┌──────────────────────────────────┬────────────────────────────┐
│  Registry table (resized)        │  AUDIT PANEL  (320px)      │
│                                  │                            │
│  [selected row highlighted]      │  auth.facebook_login       │
│                                  │  Facebook OAuth Login      │
│                                  │                            │
│                                  │  Current state: ON ●       │
│                                  │  [ Toggle OFF ]            │
│                                  │                            │
│                                  │  Incident note (optional): │
│                                  │  [ __________________ ]    │
│                                  │                            │
│                                  │  Change History            │
│                                  │  ─────────────────────     │
│                                  │  No changes recorded.      │
│                                  │                            │
│                                  │  [ × Close ]               │
└──────────────────────────────────┴────────────────────────────┘
```

---

## Components

### Summary Bar

- Full-width bar directly below the page header, `space-5` padding
- Background: `color-bg-surface`; border-bottom: 1px `color-border`
- **When all ON:** `●` (8px circle, `color-accent`) + `"All features ON"` + `"(0 switches currently OFF)"` — `text-body`, `color-text-secondary`
- **When any OFF:** `●` (8px circle, `color-error`) + `"[N] switch(es) currently OFF"` — `text-body`, `color-error`; followed by a list of OFF switch keys as inline pills (`color-error-subtle` bg, `color-error` text, `text-micro`, `radius-full`)
- **Emergency Guide link:** right-aligned anchor `Emergency Guide ↗` — `text-small`, `color-accent`; opens the emergency protocol documentation in a new tab

### Domain Group (collapsible section)

- **Group header row:** `space-5` horizontal padding, 44px height
  - Collapse chevron (▾ open / ▸ closed) — 16px stroke, `color-text-secondary`
  - Group label — `text-body`, Medium, `color-text-primary` (e.g. `Authentication & Access`)
  - Switch count badge — `text-micro`, `color-text-disabled`, parenthetical (e.g. `[ 2 switches ]`)
  - If any switch in the group is OFF: group label turns `color-error`; a red dot (8px) appears left of the chevron
- Background: transparent; hover: `color-bg-elevated`
- Click anywhere on the header row toggles collapse/expand; all groups are expanded by default
- Border-bottom: 1px `color-border` between groups

### Registry Table (within each group)

- No outer border (contained within the group)
- **Columns:**
  - `Key` (25%) — `text-mono` (monospace, 13px), `color-text-secondary`; truncated with ellipsis if long, full key visible on hover tooltip
  - `Feature Name` (35%) — `text-body`, `color-text-primary`
  - `State` (15%) — toggle switch component (see below)
  - `Last Changed` (15%) — `text-small`, `color-text-secondary`; relative timestamp (e.g. `"3 days ago"`); `—` if never changed
  - `Changed By` (10%) — `text-small`, `color-text-secondary`; admin name; `—` if never changed
- Header row: `text-micro`, uppercase, `color-text-disabled`; 40px height; border-bottom 1px `color-border`
- Data rows: 52px height; border-bottom 1px `color-border` (except last row); hover → `color-bg-elevated`
- Clicking a row opens the Audit Panel for that switch; selected row: `color-accent-subtle` background, `radius-sm` left inset bar (3px `color-accent`)

### Toggle Switch Component

- Width: 48px, height: 26px
- **ON state:** `color-accent` track, white knob (22px circle), knob on the right
- **OFF state:** `color-error` track, white knob on the left
- Transition: 200ms ease for knob slide and track colour
- Default OFF (not yet live) state: `color-bg-elevated` track (grey), knob left — only applies to the `tournaments.module` switch
- Clicking the toggle immediately opens a Confirmation Modal before the state changes

### Confirmation Modal (toggle action)

Triggered when any toggle is clicked.

```
┌─────────────────────────────────────────────────┐
│  Turn OFF: sessions.creation?                   │
│  ─────────────────────────────────────────────  │
│  Session creation will be immediately disabled  │
│  for all Que Masters on the platform.           │
│                                                 │
│  Users will see: "Session creation temporarily  │
│  unavailable"                                   │
│                                                 │
│  Incident note (optional)                       │
│  [ Add a note for the audit log... _________ ]  │
│                                                 │
│  [  Cancel  ]          [ Turn OFF → ]           │
└─────────────────────────────────────────────────┘
```

- Background overlay: `rgba(0,0,0,0.72)`
- Card: `color-bg-surface`, `radius-xl`, `shadow-modal`, max-width 480px, centered
- Padding: `space-8`
- **Title:** `"Turn OFF: [switch.key]?"` or `"Turn ON: [switch.key]?"` — `text-heading` (18px, SemiBold), `color-text-primary`
- **Description:** fallback message the user will see + impact summary — `text-body`, `color-text-secondary`
- **Incident note textarea:** optional; `text-body`, `color-bg-elevated` bg, `radius-md`, `color-border` border; placeholder `"Add a note for the audit log..."`; max 500 chars; character counter (`text-micro`, `color-text-disabled`)
- **Cancel button:** `color-bg-elevated` background, `color-text-primary` label; `radius-md`; height 40px
- **Confirm button:** turning OFF → `color-error` background; turning ON → `color-accent` background; white label; `radius-md`; height 40px
- On `prod` environment: an additional warning banner inside the modal — `"You are modifying PRODUCTION. This change takes effect immediately for all live users."` — `color-error-subtle` bg, `color-error` text, `radius-sm`

### Audit Panel (right-side drawer)

Slides in from the right when a switch row is clicked.

- Width: 320px; height: full viewport minus shell bars; fixed to right edge of main content area
- Background: `color-bg-surface`; left border: 1px `color-border`; `shadow-modal`
- **Header:**
  - Switch key — `text-mono` (13px), `color-text-secondary`
  - Feature name — `text-heading` (18px, SemiBold), `color-text-primary`
  - Close (`×`) button — `color-text-disabled`, top-right
- **Current state row:**
  - Label `Current state:` — `text-small`, `color-text-secondary`
  - State pill: `ON` = `color-accent-subtle` bg + `color-accent` text; `OFF` = `color-error-subtle` bg + `color-error` text; `text-label`, Medium
  - Inline toggle button: `[ Toggle OFF ]` or `[ Toggle ON ]` — `text-small`, `color-accent`; triggers the Confirmation Modal
- **Incident note field:** only shown when state is OFF (active incident)
  - Label: `Active incident note:` — `text-small`, `color-text-secondary`
  - Editable textarea (same styling as modal textarea); saves on blur
- **Change History section:**
  - Section label: `Change History` — `text-small`, uppercase, `color-text-disabled`
  - Timeline list: each entry shows — timestamp (full UTC) + admin name + action (`→ ON` / `→ OFF`) + incident note (if any)
  - Entry style: `text-small`, `color-text-secondary`; entries separated by 1px `color-border`; max 10 entries shown; `"View all in audit log →"` link if more exist
  - Empty state: `"No changes recorded."` — `text-small`, `color-text-disabled`

---

## States

### All Switches ON (default)
Summary bar shows green indicator and "All features ON." All toggle switches show green ON state.

### Switch Turned OFF (active)
- Toggle shows red OFF state
- Row highlights with `color-error-subtle` background
- Summary bar count increments; OFF switch key appears as an error pill
- Domain group header label turns `color-error`; red dot appears next to group chevron
- Audit Panel (if open for that switch) shows updated history entry and active incident note field

### Incident in Progress
Admin opens the Audit Panel for an OFF switch, adds a note to the active incident note field. The note is saved to the audit log and visible to all admins viewing the same panel.

### Emergency Multi-Switch Protocol
No special multi-select mode exists. Admins toggle each switch individually following the emergency protocol. The summary bar provides a live count to confirm all necessary switches have been addressed.

---

## Responsive Layout

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Full layout; audit panel open alongside table |
| Desktop (compact) | 1024px–1279px | Audit panel opens as an overlay drawer (not side-by-side); table remains full-width |
| Tablet | 768px–1023px | Sidebar hidden; audit panel opens as a bottom sheet; table columns reduce (Key + Feature + State only) |
| Mobile | < 768px | Not supported |

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-surface` | Group headers, audit panel, modal card |
| `color-bg-elevated` | Row hover, input backgrounds, cancel button |
| `color-border` | Group separators, table rows, audit panel border |
| `color-accent` | Toggle ON state, selected row bar, confirm ON button, CTA links |
| `color-accent-subtle` | Toggle ON track, ON state pill background, selected row background |
| `color-error` | Toggle OFF track, OFF state pill text, confirm OFF button, group label when OFF, summary bar |
| `color-error-subtle` | OFF row highlight, OFF state pill background, modal prod warning |
| `color-warning` | Group header dot for AMBER states (future use) |
| `color-text-primary` | Feature names, modal title, audit panel feature name |
| `color-text-secondary` | Switch keys, column headers, timestamps |
| `color-text-disabled` | Change history section label, character counter |
| `shadow-modal` | Confirmation modal, audit panel |
| `radius-xl` 20px | Modal card |
| `radius-md` 10px | Buttons, inputs |
| `text-heading` 18px SemiBold | Modal title, audit panel feature name |
| `text-body` 15px | Feature names, modal description |
| `text-small` 13px | Key column, metadata, audit entries |
| `text-mono` 13px | Switch key identifiers |
| `text-micro` 10px | State labels, group switch counts |
