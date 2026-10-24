# View: Moderation

## Purpose

The moderation view handles all human-review tasks that cannot be resolved automatically. It is divided into two primary tabs: **Flagged Reviews** (player-submitted review flags awaiting admin judgment) and **Account Actions** (search, inspect, and take action on any player account). A read-only **Audit Log** tab provides a full history of every moderation action ever taken.

Moderation decisions are irreversible through the UI (deleted reviews cannot be restored; suspensions require explicit lifting). Every action is logged immutably with the admin's identity and reason.

## Route

`/admin/moderation` — authenticated admins only

Deep-linkable tabs:
- `/admin/moderation` — defaults to Flagged Reviews tab
- `/admin/moderation?tab=accounts` — opens Account Actions tab directly
- `/admin/moderation?tab=audit` — opens Audit Log tab

## Roles

Platform Admin, Super Admin. Permanent account suspension and account deletion require Super Admin. All other moderation actions are available to all Admin roles.

---

## Layout

Standard shell with a tab bar directly below the page header. Each tab has its own full-width content area.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR (240px)    │  ● PRODUCTION                              Admin ▾   │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard      │  Moderation                                          │
│  [▪] Kill Switches  │  ─────────────────────────────────────────────────   │
│  [▪] Environments   │  [ Flagged Reviews  2 ] [ Account Actions ] [ Audit ]│
│  [▪] Approvals      │  ═══════════════════                                 │
│  [▪] Moderation  2← ├──────────────────────────────────────────────────────┤
│  ...                │                                                      │
│                     │  TAB CONTENT AREA                                    │
│                     │                                                      │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## Tab 1: Flagged Reviews

Split-pane layout: queue on the left (45%), detail panel on the right (55%).

```
┌──────────────────────────────────┬──────────────────────────────────────────┐
│  FLAG QUEUE  (45%)               │  REVIEW DETAIL  (55%)                   │
│                                  │                                         │
│  [ Filter: Pending ▾ ] [Sort ▾]  │  ← Select a flagged review to review   │
│                                  │                                         │
│  ┌──────────────────────────┐    │                                         │
│  │ Review by: Carlos D.     │    │                                         │
│  │ About: Alex S. · Match   │    │                                         │
│  │ Flag: Harassment         │    │                                         │
│  │ Flagged 5 hrs ago [Pend] │    │                                         │
│  ├──────────────────────────┤    │                                         │
│  │ Review by: Maria R.      │    │                                         │
│  │ ...                      │    │                                         │
│  └──────────────────────────┘    │                                         │
└──────────────────────────────────┴─────────────────────────────────────────┘
```

When a flag row is selected, the detail panel loads:

```
REVIEW DETAIL PANE
──────────────────────────────────────────────────────────────────────────────
Flagged Review                                             Mar 30, 2026

  REVIEW CONTENT
  ┌──────────────────────────────────────────────────────────────────────┐
  │ "This player is a sandbagger. He deliberately lost the first game    │
  │  to hustle us. Avoid at all costs."                                  │
  └──────────────────────────────────────────────────────────────────────┘
  Written by: Carlos Dizon  ·  [ View Profile ↗ ]
  About:      Alex Santos   ·  [ View Profile ↗ ]
  Match:      Mar 28, 2026 · Sunrise BC · Doubles  ·  [ View Match ↗ ]

  FLAG DETAILS
  Reason:     Harassment / False factual claim
  Flagged by: Maria Reyes (teammate of Alex Santos)  ·  [ View Profile ↗ ]
  Flagged at: Mar 30, 2026 08:41 UTC

  CONTENT POLICY REFERENCE
  ▸ Personal attacks or harassment
  ▸ False factual claims presented as fact

  ACTION
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Select action:  [ Choose action ▾ ]                                │
  │                                                                     │
  │  Admin notes (internal, not shown to users):                        │
  │  [ ________________________________________________________________ ]│
  │                                                                     │
  │  [  Cancel  ]                      [ Confirm Action → ]             │
  └─────────────────────────────────────────────────────────────────────┘
──────────────────────────────────────────────────────────────────────────────
```

### Flag Queue List

- Background: `color-bg-surface`
- Each row: 88px height, `space-4` padding; border-bottom 1px `color-border`
- Row layout (top to bottom, left to right):
  - Line 1: `"Review by: [Reviewer Name]"` — `text-body` (15px, Medium), `color-text-primary`
  - Line 2: `"About: [Subject Name] · [Match context]"` — `text-small`, `color-text-secondary`
  - Line 3: Flag reason pill + submission age + status badge (right-aligned)
- **Flag reason pill:** `color-warning-subtle` bg, `color-warning` text, `radius-full`, `text-micro`
- **Status badge:**
  - `Pending` — `color-warning-subtle` bg, `color-warning` text
  - `Dismissed` — `color-bg-elevated` bg, `color-text-disabled` text
  - `Removed` — `color-error-subtle` bg, `color-error` text
- Selected row: `color-accent-subtle` bg, 3px left inset bar `color-accent`
- Hover: `color-bg-elevated` bg
- Queue controls (filter + sort): same dropdown component spec as Approvals view

### Review Detail Panel

**Review Content Block:**
- `color-bg-elevated` background, `radius-lg`, `space-4` padding
- Review text: `text-body`, `color-text-primary`, italic
- `"Written by:"` and `"About:"` metadata below: `text-small`, `color-text-secondary`; profile links `color-accent`
- Match link: `text-small`, `color-accent`

**Flag Details Block:**
- Label-value pairs in a two-column grid (`text-small` left, `text-body` right)
- `color-bg-surface` background, `radius-md`, `space-4` padding, `color-border` border

**Content Policy Reference:**
- Label: `"Content Policy Reference"` — `text-small`, uppercase, `color-text-disabled`
- Bullet points highlighting which policy clauses are relevant — `text-small`, `color-text-secondary`; icons from Lucide/Phosphor (warning-triangle, 14px, `color-warning`)

**Action Panel:**

- Action dropdown: `"Choose action ▾"` — dropdown with four options:
  1. **Dismiss flag** — Review remains; flag closed; flagger notified
  2. **Remove review** — Review deleted; reviewer notified
  3. **Remove + Warn reviewer** — Review deleted; reviewer receives warning
  4. **Remove + Suspend reviewer** — Review deleted; reviewer suspended (triggers Account Actions suspension flow inline)
- Dropdown: `color-bg-elevated` bg, `color-border` border, `radius-md`, `text-body`, 40px height; selected option highlighted in `color-accent`
- **Admin notes textarea:** optional internal note, not visible to users; same input styling; max 1000 chars; character counter
- **Cancel button:** `color-bg-elevated`, `color-text-primary`, `radius-md`, height 40px
- **Confirm Action button:** disabled until an action is selected; active state `color-accent` bg, white label; height 40px, `radius-md`

When `"Remove + Suspend reviewer"` is selected in the dropdown, an additional inline suspension config block appears:

```
  Suspension type:  ○ Temporary  ◉ Permanent
  Duration (if temporary):  [ 7  ] days
  Suspension reason (shown to player):
  [ ________________________________________________________________ ]
```

- Radio buttons: `color-accent` for selected
- Duration numeric input: same styling as rate limit inputs
- Reason textarea: shown to the suspended player; max 500 chars

---

## Tab 2: Account Actions

Search-first interface. The admin searches for a player account and then takes action.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Find a player account                                                       │
│  [ 🔍  Search by name, username, or player ID __________________ ]          │
│                                                                              │
│  ── Search Results ──────────────────────────────────────────────           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  [av]  Alex Santos  ·  @alex_santos  ·  Elite 1  ·  Active            │  │
│  │        Member since Jan 2026  ·  87 matches  ·  2 clubs               │  │
│  │        [ View Full Profile ]  [ Take Action ▾ ]                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

When "Take Action" is selected on a result, an account action panel expands below the result row:

```
  ACCOUNT ACTION PANEL for Alex Santos
  ───────────────────────────────────────────────────────────
  Current status: Active
  Action history: 0 warnings · 0 suspensions

  Select action:
  ○ Warn               Send an in-app warning message
  ○ Suspend (temp)     Block login for a period
  ○ Suspend (perm)     Permanently disable account  [Super Admin only]
  ○ Delete account     Remove account and anonymise all PII  [Super Admin only]

  [ Action details fields — vary by selection ]

  [  Cancel  ]                         [ Confirm Action → ]
```

### Search Bar

- Full-width search input, height 48px, `color-bg-elevated` bg, `color-border` border, `radius-lg`
- Placeholder: `"Search by name, username, or player ID"`
- Search icon (20px stroke, `color-text-disabled`) left-inset in the input
- Searches fire on Enter key or after 400ms debounce from the last keystroke
- Results limited to 10 per search; `"Show more"` link if more exist

### Search Result Row

- Background: `color-bg-surface`; `radius-lg`; `color-border` border; `space-5` padding; `space-4` bottom margin
- Layout:
  - **Left:** Avatar (40×40px circle, `radius-full`, initials-based) + account details block
  - **Account details:** Name (`text-body`, Medium, `color-text-primary`) + username + tier name (small pill) + account status badge
  - **Sub-line:** `"Member since [month year] · [N] matches · [N] clubs"` — `text-small`, `color-text-secondary`
  - **Right:** Two actions — `[ View Full Profile ]` (`text-small`, `color-accent`) and `[ Take Action ▾ ]` (dropdown button, `color-bg-elevated`, `color-text-primary`, `radius-md`)
- Account status badge:
  - `Active` — `color-accent-subtle` bg, `color-accent` text
  - `Suspended (temp)` — `color-warning-subtle` bg, `color-warning` text; includes suspension end date on hover
  - `Suspended (perm)` — `color-error-subtle` bg, `color-error` text
  - `Deleted` — `color-bg-elevated` bg, `color-text-disabled` text

### Account Action Panel (inline expansion)

Expands below the result row with a 200ms slide-down animation.

- Background: `color-bg-elevated`; `radius-lg`; `color-border` border (top only); `space-5` padding

**Current Status Bar:**
- `"Current status: [Active / Suspended / ...]"` — `text-small`, `color-text-secondary`
- `"Action history: [N] warnings · [N] suspensions"` — `text-small`, `color-text-secondary`; if any history exists, a `"View history →"` link opens the Moderation Audit Log filtered to this player

**Action Radio Group:**

Four options as radio buttons:

| Option | Description | Restriction |
|---|---|---|
| Warn | Sends an in-app warning message; no login impact | None |
| Suspend (temporary) | Blocks login for a specified duration; player logged out immediately | None |
| Suspend (permanent) | Account permanently disabled; player logged out immediately | Super Admin only |
| Delete account | Account deleted; all PII removed; match records anonymised | Super Admin only |

- Radio button: 16px circle, `color-accent` fill when selected, `color-border` outline when unselected
- Option label: `text-body`, `color-text-primary`
- Option description: `text-small`, `color-text-secondary`
- Super Admin-only options: rendered but disabled for non-Super Admin; tooltip `"Requires Super Admin privileges."`; label shows `[Super Admin only]` in `text-micro`, `color-text-disabled`

**Action Detail Fields (conditional on selected action):**

- **Warn:** Warning message textarea — `"Message to player (shown in-app):"` label; max 500 chars; required
- **Suspend (temp):** Duration numeric input (`[N] days`) + reason textarea (`"Reason shown to player:"`, max 500 chars, required)
- **Suspend (perm):** Reason textarea + explicit checkbox `"I understand this permanently disables the account."` — checkbox must be checked to enable Confirm
- **Delete account:** Two checkboxes both required:
  - `"I confirm this player's account and PII will be permanently deleted."`
  - `"I understand that match records will be anonymised but not deleted."`

**Buttons:**
- Cancel: `color-bg-surface`, `color-text-primary`, `radius-md`, 40px
- Confirm Action: `color-error` bg for destructive actions (suspend/delete), `color-accent` bg for Warn; white label; 40px; disabled until required fields are filled

---

## Tab 3: Audit Log

Read-only chronological log of all moderation actions.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [ Filter by type ▾ ]  [ Filter by admin ▾ ]  [ Date range ▾ ]              │
│  [ Search by player or review ID _________ ]                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  Timestamp (UTC)  │  Admin    │  Action Type        │  Target  │  Notes     │
│  ─────────────────┼───────────┼─────────────────────┼──────────┼─────────── │
│  2026-03-30 08:41 │  Jose B.  │  review_removed     │  #r_1234 │  Harass.   │
│  2026-03-29 14:22 │  Jose B.  │  account_warned     │  #u_5678 │  —         │
│  ...                                                                         │
│                                                     [ Export CSV ] [ Export PDF ]│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Filter dropdowns:** Action type (all / review_removed / flag_dismissed / account_warned / account_suspended_temp / account_suspended_perm / account_deleted) · Admin (all admins) · Date range (last 7d / 30d / 90d / custom)
- **Search input:** filters rows by player name, player ID, or review ID
- **Table columns:** Timestamp (UTC) · Admin · Action Type · Target · Reason Code · Notes (truncated, full text on hover)
- Row height: 48px; alternating `color-bg-base` / `color-bg-surface` rows; no row hover action (read-only)
- **Export buttons:** `[ Export CSV ]` and `[ Export PDF ]` — `color-bg-elevated`, `color-text-primary`, `radius-md`, 36px height; trigger download of the current filtered view

---

## States

### Flagged Reviews — Empty Queue
No pending flags: large checkmark icon + `"No pending reviews. All caught up."` — `text-heading`, `color-text-secondary`.

### Account Actions — No Search Yet
Prompt copy centered in the tab: `"Search for a player to take action on their account."` — `text-body`, `color-text-disabled`.

### Account Actions — No Results
`"No accounts found matching '[query]'."` — `text-body`, `color-text-disabled`, below the search bar.

### Action Confirmed
- Review/flag queue row updates badge to `Dismissed` or `Removed`
- Detail panel shows read-only outcome: `"[Action] by [Admin] on [date] — [reason]"`
- Account result row shows updated status badge
- Sidebar `Moderation` badge decrements

### Suspension In Effect
When a suspended account is found via search:
- Status badge shows `Suspended (temp)` or `Suspended (perm)`
- `Take Action` dropdown shows a `Lift Suspension` option (top of list, `color-accent` text) if suspension type is temporary or was applied by a non-Super Admin
- Permanent suspension can only be lifted by a Super Admin

---

## Responsive Layout

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Split pane for Flagged Reviews; full-width for Account Actions and Audit Log |
| Desktop (compact) | 1024px–1279px | Same; split pane ratios adjust (40% / 60%) |
| Tablet | 768px–1023px | Flagged Reviews: queue full-width, detail as right drawer overlay; Account Actions: single column |
| Mobile | < 768px | Not supported |

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-surface` | Flag queue, result rows, action panel |
| `color-bg-elevated` | Row hover, search bar, textarea inputs, action detail fields |
| `color-border` | Row separators, table borders, panel dividers |
| `color-accent` | Confirm action button (warn), selected radio, profile links, active tab underline |
| `color-accent-subtle` | Active account badge background, selected flag row |
| `color-error` | Removed badge, suspended-perm badge, confirm destructive action button |
| `color-error-subtle` | Removed badge background, suspended-perm badge background |
| `color-warning` | Pending badge, flag reason pill, suspended-temp badge |
| `color-warning-subtle` | Pending badge bg, flag reason pill bg, suspended-temp badge bg |
| `color-text-primary` | Player names, review text, action labels |
| `color-text-secondary` | Metadata, action descriptions, flag details |
| `color-text-disabled` | Policy reference headers, empty states, super-admin-only labels |
| `shadow-modal` | Not used directly; action panel uses inline expansion |
| `radius-lg` 14px | Search result rows, action panel, review content block |
| `radius-md` 10px | Buttons, inputs, dropdowns |
| `text-body` 15px | Player names, review text, action labels |
| `text-small` 13px | Metadata, sub-lines, status text |
| `text-micro` 10px | Badge text, character counters |
