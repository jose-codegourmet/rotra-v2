# View: Platform Configuration

## Purpose

The platform configuration view manages the global constants that govern how the Client App behaves — EXP reward rates, ranking tier thresholds, skill dimension definitions, and system-level thresholds. All values are editable here without a code deploy and take effect immediately on save.

Because changes here affect every player's experience (EXP earnings, tier progressions, rating unlocks), each save requires a password confirmation. The system also enforces business rules inline — for example, blocking a tier threshold change that would retroactively demote players. Draft states do not exist; every saved change is live.

## Route

`/admin/platform-config` — authenticated admins only

## Roles

Platform Admin, Super Admin. Bulk changes across multiple dimensions require Super Admin approval. All individual edits are available to all Admin roles.

---

## Layout

Tab bar below the page header, containing four tabs. Each tab has a two-panel layout: a main editable content panel (65%) and a contextual info/reference panel (35%) with relevant rules and recent change history for that tab.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR (240px)    │  ● PRODUCTION                              Admin ▾   │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard      │  Platform Configuration                              │
│  [▪] Kill Switches  │  ─────────────────────────────────────────────────   │
│  [▪] Environments   │  [ EXP Rates ] [ Tier Thresholds ] [ Skill Dims ]    │
│  [▪] Approvals      │  [ System Thresholds ]                               │
│  [▪] Moderation     │  ═══════════                                         │
│  [▪] Platform    ←  ├───────────────────────────────────┬──────────────────┤
│       Config        │  EDIT PANEL  (65%)                │ REFERENCE  (35%) │
│  [▪] Analytics      │                                   │                  │
│                     │  [tab content]                    │ [rules + history]│
└─────────────────────┴───────────────────────────────────┴──────────────────┘
```

---

## Tab 1: EXP Rates

An editable table of all EXP-awarding actions and their current values.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  EXP Rates                                                                   │
│  Changes apply to future actions only. Historical EXP is not recalculated.  │
│                                                                              │
│  Action Key              Description                     EXP Value          │
│  ──────────────────────────────────────────────────────────────────────────  │
│  exp.match_played        EXP per match played            [ 10  ]  ✏         │
│  exp.match_won           Bonus EXP for winning           [ 15  ]  ✏         │
│  exp.review_submitted    EXP for post-match review       [ 5   ]  ✏         │
│  exp.session_attended    EXP for attending a session     [ 5   ]  ✏         │
│  exp.profile_completed   One-time: profile completed     [ 50  ]  ✏         │
│  exp.gear_added          EXP per gear item (up to 3)     [ 10  ]  ✏         │
│  exp.first_match         One-time: first match played    [ 25  ]  ✏         │
│  exp.club_joined         EXP for joining a club          [ 10  ]  ✏         │
│                                                                              │
│  [ Save EXP Rates ]                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### EXP Rates Table

- Full-width table within the edit panel; `color-bg-surface` background; `radius-lg`
- **Column headers:** `text-micro`, uppercase, `color-text-disabled`; 40px header row; border-bottom 1px `color-border`
- **Columns:**
  - `Action Key` (28%) — `text-mono` (13px), `color-text-secondary`
  - `Description` (45%) — `text-body`, `color-text-primary`
  - `EXP Value` (27%) — inline numeric input + edit icon
- **Each data row:** 52px height; border-bottom 1px `color-border`; last row no border
- **EXP Value cell:**
  - Default (not editing): value displayed as `text-heading` (18px, SemiBold), `color-text-primary` + pencil icon (14px, `color-text-disabled`) to the right
  - Clicking the pencil icon (or the value) activates an inline numeric input: 72px wide, 36px height, `color-bg-elevated` bg, `color-border` border, `radius-md`, `text-heading`, `color-text-primary`, center-aligned
  - Minimum value: 0; integer only
  - Clicking elsewhere or pressing Enter/Tab commits the edit (marks the row as modified, does not save to server)
  - Modified rows: left inset bar 3px `color-warning`; row background `color-warning-subtle` (very subtle)
- **Save EXP Rates button:** anchored below the table; `color-accent` bg, white label, `radius-md`, 40px; disabled until at least one value is modified; triggers Save Confirmation Modal

### EXP Rates Reference Panel

- Section: `"Rules"` — `text-small`, uppercase, `color-text-disabled`
  - `"Changes apply to future actions only. No retroactive recalculation."`
  - `"Values must be non-negative integers."`
- Section: `"Recent Changes"` — audit log list filtered to `exp.*` keys (same format as Environment Management audit panel)

---

## Tab 2: Tier Thresholds

An editable table of all EXP-based tier sub-rank thresholds, plus read-only Apex tier config.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  EXP-Based Tier Thresholds                                                   │
│                                                                              │
│  Tier      Sub-rank   Min EXP Required                                       │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Cadet       1         [ 0    ]  (always 0; locked)                          │
│  Cadet       2         [ 150  ]  ✏                                           │
│  Warrior     1         [ 350  ]  ✏                                           │
│  Warrior     2         [ 600  ]  ✏                                           │
│  Warrior     3         [ 900  ]  ✏                                           │
│  Elite       1         [ 1300 ]  ✏                                           │
│  ...                                                                         │
│  Titan       5         [ 27000]  ✏   (Apex eligibility floor)               │
│                                                                              │
│  ── Apex Tier Config ─────────────────────────────────────────────────────── │
│  apex.min_exp_to_qualify       [ 27000 ]  ✏                                 │
│  apex.snapshot_interval_hours  [ 24    ]  ✏                                 │
│                                                                              │
│  [ Save Tier Thresholds ]                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Tier Thresholds Table

- Same table spec as EXP Rates table
- **Columns:** `Tier` (20%) · `Sub-rank` (15%) · `Min EXP Required` (40%) · `Current Players at This Sub-rank` (25%, read-only)
- `Current Players` column: `text-small`, `color-text-secondary` — shows the count of players currently at this exact sub-rank; helps admins understand the impact of threshold changes
- **Tier colour coding:** Tier label has a small left-edge colour bar matching the tier's canonical colour (grey = Cadet, green = Warrior, blue = Elite, purple = Master, red = Titan)
- **Cadet 1 row:** EXP value locked at `0`; input is read-only; lock icon replaces pencil; tooltip `"The starting tier is always 0 EXP."`
- **Threshold validation (inline):** when a value is changed and the field loses focus, the system checks:
  - If the new value is lower than the previous tier's minimum → inline error: `"Cannot be lower than the previous tier threshold ([N] EXP)."`
  - If the new value is lower than the highest EXP currently held by any player at this sub-rank → inline warning: `"[N] players currently at this sub-rank have EXP above your new threshold. They will not be retroactively demoted, but this threshold change is blocked."` — `color-error` text; the row's input reverts to its last valid value on Save attempt
- **Apex Tier Config section:** same inline-input style as above rows; 2 fields only; separated from the main table by a `color-border` divider with a section label `"Apex Tier (Position-Based)"` in `text-small`, uppercase, `color-text-disabled`

### Tier Thresholds Reference Panel

- Section: `"Rules"` — `text-small`, uppercase, `color-text-disabled`
  - `"Thresholds can be raised but never lowered below the highest EXP currently held by any player at that sub-rank."`
  - `"Changes apply to future EXP accumulation only."`
  - Reference: `"RULE-042 — Ranking tiers never decrease below the tier already achieved."`
- Section: `"Apex Tier Explanation"` — brief description of position-based Apex assignment
- Section: `"Recent Changes"` — audit log list filtered to tier threshold keys

---

## Tab 3: Skill Dimensions

Management interface for the skill dimension schema used in post-match ratings.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Skill Dimensions                               [ + Add Dimension ]          │
│                                                                              │
│  ID                    Name               Status    Actions                  │
│  ────────────────────────────────────────────────────────────────────────── │
│  dim_attack            Attack             Active    [ Edit ] [ Retire ]      │
│  dim_defense           Defense            Active    [ Edit ] [ Retire ]      │
│  dim_net_touch         Net & Touch        Active    [ Edit ] [ Retire ]      │
│  dim_precision         Precision & Control Active   [ Edit ] [ Retire ]      │
│  dim_athleticism       Athleticism        Active    [ Edit ] [ Retire ]      │
│  dim_game_intelligence Game Intelligence  Active    [ Edit ] [ Retire ]      │
│                                                                              │
│  ── Retired Dimensions (hidden from rating form) ──────────────────────── │
│  [no retired dimensions]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Skill Dimensions Table

- **Columns:** `ID` (25%) · `Name` (30%) · `Status` (15%) · `Display Order` (15%) · `Actions` (15%)
- **ID column:** `text-mono`, `color-text-secondary` — immutable; no edit control
- **Name column:** `text-body`, `color-text-primary`
- **Status badge:**
  - `Active` — `color-accent-subtle` bg, `color-accent` text
  - `Retired` — `color-bg-elevated` bg, `color-text-disabled` text
- **Display Order column:** drag handle icon (⠿, 16px, `color-text-disabled`) + numeric order value (`text-body`, `color-text-secondary`); rows can be reordered via drag-and-drop — dragging a row shows a blue drop indicator line
- **Action buttons (Active rows):**
  - `[ Edit ]` — `text-small`, `color-accent`, no border; opens the Edit Dimension inline form
  - `[ Retire ]` — `text-small`, `color-error`; triggers Retire Confirmation Modal
- **Action buttons (Retired rows):**
  - `[ Restore ]` — `text-small`, `color-accent`; restores the dimension to Active
  - No `[ Edit ]` on retired rows (name is still editable via a modal but rarely needed)
- Retired dimensions are grouped in a collapsible section at the bottom with a subdued header

### Add Dimension Button

- Top-right of the section: `[ + Add Dimension ]` — `color-accent` bg, white label `text-label`, `radius-md`, 36px height
- Opens the Add Dimension modal

### Edit Dimension Inline Form

When Edit is clicked, the dimension row expands inline:

```
  dim_attack
  ─────────────────────────────────────────────────────────────────────
  Name:         [ Attack ________________________________ ]
  Description:  [ Ability to generate powerful offensive shots... ]
                (Shown in the rating form — max 120 chars)

  Sub-skills:   ┌─────────────────────────────┐  [ + Add Sub-skill ]
                │ • Smash Power               │
                │ • Drop Shot Accuracy        │
                └─────────────────────────────┘

  [ Cancel ]                                         [ Save Changes ]
```

- Name input: same text input spec; max 40 chars; required
- Description textarea: max 120 chars; character counter; `text-small`, `color-text-secondary` placeholder
- Sub-skills list: each sub-skill is a text row with a `×` remove button; `[ + Add Sub-skill ]` appends a new blank input row
- Save Changes button: `color-accent` bg, white, `radius-md`, 40px

### Add Dimension Modal

```
┌──────────────────────────────────────────────────┐
│  Add New Skill Dimension                         │
│  ─────────────────────────────────────────────   │
│  Name:        [ ________________________________]│
│  Description: [ ________________________________]│
│               [ ________________________________]│
│               Max 120 characters                 │
│                                                  │
│  A unique ID will be generated automatically.    │
│  This dimension will appear in the rating form   │
│  immediately after saving.                       │
│                                                  │
│  [  Cancel  ]         [ Add Dimension → ]        │
└──────────────────────────────────────────────────┘
```

- Same modal card spec
- ID auto-generated: shown as a preview in `text-mono`, `color-text-disabled` (e.g. `ID: dim_newname`)
- Note about immediate effect: `text-small`, `color-text-secondary`
- Confirm button: `color-accent` bg

### Retire Confirmation Modal

```
┌──────────────────────────────────────────────────┐
│  Retire "Net & Touch"?                           │
│  ─────────────────────────────────────────────   │
│  This dimension will be hidden from the rating   │
│  form. Players will no longer rate it.           │
│                                                  │
│  Historical ratings against this dimension are   │
│  preserved and will remain on player profiles    │
│  until the dimension is restored.                │
│                                                  │
│  [  Cancel  ]              [ Retire Dimension ]  │
└──────────────────────────────────────────────────┘
```

- Retire button: `color-warning` background, dark label (not `color-error` — retiring is recoverable)
- Note on data preservation: `text-small`, `color-text-secondary`

### Skill Dimensions Reference Panel

- Section: `"Rules"` — `text-small`, uppercase
  - `"Dimension IDs are immutable once created."`
  - `"Editing a name does not affect stored ratings — they remain linked to the ID."`
  - `"Retiring a dimension does not delete historical data."`
  - `"Adding a new dimension does not backfill past ratings."`
  - `"Bulk changes (multiple dimensions at once) require Super Admin approval."`
- Section: `"Recent Changes"` — audit log filtered to skill dimension keys

---

## Tab 4: System Thresholds

Editable table of global system-level defaults. Club Owners and Que Masters can override these per club or session; this tab sets the platform-wide baseline.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  System Thresholds                                                           │
│  These are platform-wide defaults. Per-club and per-session overrides apply │
│  on top of these values.                                                     │
│                                                                              │
│  Config Key                              Description              Value      │
│  ──────────────────────────────────────────────────────────────────────────  │
│  thresholds.no_show_window_minutes       No-show alert window     [ 15  ] min│
│  thresholds.smart_monitoring_pct         Alert trigger (% of win) [ 90  ] %  │
│  thresholds.review_window_hours          Review window after match[ 24  ] hr │
│  thresholds.consistent_member_sessions   Consistency min sessions [ 3   ]    │
│  thresholds.rating_unlock_min_scores     Min ratings to display   [ 5   ]    │
│  thresholds.win_rate_unlock_matches      Min matches for win rate [ 5   ]    │
│  thresholds.advanced_stats_unlock_...    Min matches for adv stats[ 20  ]    │
│  thresholds.global_leaderboard_min_...   Min matches for leaderbd [ 20  ]    │
│  thresholds.reapply_after_rejection_days Re-apply cooldown        [ 30  ] day│
│                                                                              │
│  [ Save System Thresholds ]                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### System Thresholds Table

- Same table/inline-input spec as EXP Rates
- **Columns:** `Config Key` (30%) · `Description` (40%) · `Value` (20%) · `Unit` (10%)
- `Config Key`: `text-mono`, `color-text-secondary`; full key shown (no truncation); wraps if long
- `Description`: `text-body`, `color-text-primary`
- `Value`: inline numeric input (same spec); integer only; minimum 1 for most fields
- `Unit`: `text-small`, `color-text-secondary` — `min`, `%`, `hr`, `day`, or blank
- No validation rules beyond non-negative integer (these are baseline defaults, not hard-constrained by data)

### System Thresholds Reference Panel

- Section: `"Rules"`
  - `"These are baseline defaults. Per-club and per-session overrides take precedence over these values."`
  - `"Changes take effect immediately on save for new interactions. Existing in-progress sessions are not affected."`
- Section: `"Recent Changes"` — audit log filtered to `thresholds.*` keys

---

## Save Confirmation Modal (all tabs)

Triggered when any Save button is clicked. The modal content adapts to the active tab.

```
┌──────────────────────────────────────────────────┐
│  Save changes to EXP Rates?                      │
│  ─────────────────────────────────────────────   │
│  3 values modified:                              │
│  · exp.match_played: 10 → 12                     │
│  · exp.match_won: 15 → 18                        │
│  · exp.first_match: 25 → 30                      │
│                                                  │
│  Changes apply to future actions only.           │
│                                                  │
│  Enter your password to confirm:                 │
│  [ ________________________________________ ]    │
│                                                  │
│  [  Cancel  ]              [ Save Changes → ]    │
└──────────────────────────────────────────────────┘
```

- **Title:** `"Save changes to [Tab Name]?"` — `text-heading`, `color-text-primary`
- **Change summary:** bulleted list of modified keys with old → new values; `text-body`, `color-text-secondary`; max 10 items shown (`"+ [N] more..."` if longer)
- **Impact note:** tab-specific caveat (`text-small`, `color-text-disabled`) — e.g. `"Changes apply to future actions only."` for EXP Rates
- **Password input:** required; same input styling as Login; Confirm button disabled until non-empty
- **Cancel:** `color-bg-elevated`, `color-text-primary`
- **Confirm:** `color-accent` bg, white `"Save Changes →"`
- On `prod`: additional banner inside the modal: `"You are modifying PRODUCTION. This change takes effect immediately."` — `color-error-subtle` bg, `color-error` text

---

## States

### No Unsaved Changes
All Save buttons disabled. All inline inputs display their current server values.

### Unsaved Changes Present
Modified rows have a `color-warning` left inset bar. The tab label in the tab bar shows an orange dot indicator. Save button activates.

### Validation Error (tier thresholds)
Affected row shows inline error below the input (in `color-error`, `text-small`). Save button disabled for that tab until the error is resolved.

### Save In Progress
Save button enters loading state. All inputs in the section become non-interactive.

### Save Success
Password modal dismisses. Toast: `"Configuration saved."` — `color-accent-subtle` bg, `color-accent` text, auto-dismisses in 3 seconds. Reference panel audit log updates.

### Drag-and-Drop Reorder (Skill Dimensions)
Active drag: dragged row has `shadow-modal`, slight scale-up (1.02); destination position shows a 2px `color-accent` drop indicator line. On drop: order updates immediately; reorder counts as an unsaved change and requires Save.

---

## Responsive Layout

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Two-panel: edit (65%) + reference (35%) |
| Desktop (compact) | 1024px–1279px | Two-panel (70% / 30%) |
| Tablet | 768px–1023px | Single column; reference panel collapses to an expandable "Rules & History" accordion below the edit panel |
| Mobile | < 768px | Not supported |

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-surface` | Table container, dimension cards, modal |
| `color-bg-elevated` | Inline input backgrounds, row hover, cancel buttons |
| `color-border` | Table rows, section dividers, input borders |
| `color-accent` | Save button, active tab underline, Edit links, add button, confirm modal button |
| `color-accent-subtle` | Active status badge, success toast bg, modified row bar colour (when restoring) |
| `color-warning` | Modified row inset bar, modified row bg (subtle), Retire button |
| `color-warning-subtle` | Modified row background tint |
| `color-error` | Validation errors, Retire link, prod modal banner |
| `color-error-subtle` | Prod modal banner background |
| `color-text-primary` | Row names, values, modal title |
| `color-text-secondary` | Descriptions, column headers, reference rules |
| `color-text-disabled` | Config key column, section reference labels, unit labels |
| `shadow-modal` | Modal card, active drag row |
| `radius-xl` 20px | Modal card |
| `radius-lg` 14px | Table containers |
| `radius-md` 10px | Inline inputs, buttons |
| `text-heading` 18px SemiBold | Modal title, EXP values |
| `text-body` 15px | Descriptions, dimension names |
| `text-mono` 13px | Config keys, dimension IDs |
| `text-small` 13px | Column headers, reference notes |
| `text-micro` 10px | Character counters, badge text, unit labels |
