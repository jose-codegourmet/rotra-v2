# View: Environment Management

## Purpose

The environment management view exposes the configuration parameters for the Admin App's own paired environment — App URLs, notification toggles, rate limits, and WebSocket settings. Each Admin App instance is permanently paired with exactly one environment (dev, staging, or prod) and can only manage that environment's config. There is no cross-environment control panel.

Configuration changes take effect immediately on save. Because of this, all saves require password confirmation, and production changes require an additional explicit acknowledgement. This view also provides staging-only tooling for refreshing staging data from a production snapshot.

## Route

`/admin/environments` — authenticated admins only

## Roles

Platform Admin, Super Admin. Bulk config changes and the "Refresh Data from Production" action require Super Admin privileges; all other edits are available to all Admin roles.

---

## Layout

The main content area is divided into a left configuration panel and a right audit log panel. Configuration is grouped into four expandable sections. The audit log shows changes made to this environment's config, most recent first.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR (240px)    │  ● PRODUCTION                              Admin ▾   │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard      │  Environments                                        │
│  [▪] Kill Switches  │  ─────────────────────────────────────────────────   │
│  [▪] Environments ← │  This instance manages: PRODUCTION                   │
│  ...                │                                                      │
│                     ├───────────────────────────────────┬──────────────────┤
│                     │  CONFIGURATION PANEL  (65%)       │ AUDIT LOG  (35%) │
│                     │                                   │                  │
│                     │  ▾ App URLs                       │ Recent Changes   │
│                     │  ┌────────────────────────────┐   │ ─────────────    │
│                     │  │ client_app.base_url         │   │ [entry]         │
│                     │  │ [_______________________]   │   │ [entry]         │
│                     │  │ umpire_app.base_url          │   │ [entry]         │
│                     │  │ [_______________________]   │   │                 │
│                     │  │ admin_app.base_url           │   │                 │
│                     │  │ [_______________________]   │   │                 │
│                     │  └────────────────────────────┘   │                 │
│                     │  [ Save App URLs ]                 │                 │
│                     │                                   │                 │
│                     │  ▾ Notifications                   │                 │
│                     │  ▾ Rate Limits                     │                 │
│                     │  ▾ WebSocket Config                │                 │
│                     │                                   │                 │
│                     │  ── Danger Zone ───────────────    │                 │
│                     │  [Refresh Data from Production]   │                 │
│                     │  (Staging only — grayed out here) │                 │
└─────────────────────┴───────────────────────────────────┴──────────────────┘
```

---

## Components

### Environment Identity Banner

- Full-width strip directly below the page header, above the two-panel layout
- `space-5` horizontal padding, `space-3` vertical padding
- Content: `"This instance manages:"` (`text-small`, `color-text-secondary`) + environment pill badge
  - `PRODUCTION` — `color-error` background, white `text-label`, `radius-full`
  - `STAGING` — `color-warning` background, dark `text-label`, `radius-full`
  - `DEVELOPMENT` — `color-bg-elevated` background, `color-text-secondary` `text-label`, `radius-full`
- This is a read-only display; it cannot be changed from within the UI

### Configuration Panel (65% width)

Left column of the two-panel layout. Contains four collapsible config sections and the Danger Zone.

**Section header (collapsible):**
- 44px height row, `space-5` horizontal padding
- Chevron (▾ / ▸) + section label (`text-body`, Medium, `color-text-primary`) + unsaved changes indicator (orange dot, 8px, if any field in the section has been modified and not yet saved)
- Click toggles expand/collapse; all sections expanded by default
- Border-bottom: 1px `color-border`

**Section content:** `space-5` padding; `color-bg-surface` background; `radius-lg` per section card

**Save button per section:** `"Save [Section Name]"` — `color-accent` background, white label, `text-label`, `radius-md`, 40px height; appears at the bottom of each section. Disabled (greyed out) unless a field within that section has been modified.

#### Section 1 — App URLs

Three URL fields, one per app:

| Field Key | Label | Placeholder |
|---|---|---|
| `client_app.base_url` | Client App Base URL | `https://app.rotra.gg` |
| `umpire_app.base_url` | Umpire App Base URL | `https://umpire.rotra.gg` |
| `admin_app.base_url` | Admin App Base URL | `https://admin.rotra.gg` |

- Each field: text input, full-width, height 40px, `color-bg-elevated` bg, `radius-md`, `color-border` border, `text-body`, `color-text-primary`
- Label: `text-small`, `color-text-secondary`, above each input
- Validation: must be a valid `https://` URL; inline error `"Must be a valid HTTPS URL"` shown below the field if invalid on blur
- `admin_app.base_url` is read-only (cannot be changed from within the app; displayed for reference only) — rendered as a greyed-out input with a lock icon

#### Section 2 — Notifications

Three toggle rows:

| Config Key | Label | Description |
|---|---|---|
| `notifications.email.enabled` | Outbound emails | Whether the platform sends email notifications |
| `notifications.push.enabled` | Push notifications | Whether the platform sends push notifications to mobile clients |
| `notifications.sms.enabled` | SMS alerts (future) | Reserved for future SMS integration |

- Each row: flex row — label (`text-body`, `color-text-primary`) + description (`text-small`, `color-text-secondary`, below label) + toggle switch (right-aligned)
- Toggle switch: same spec as Kill Switches view (green ON, red OFF, 48×26px)
- In `dev` and `staging`: all three toggles default to OFF with a soft note: `"Notifications are suppressed by default in non-production environments."` — `color-warning-subtle` background banner, `text-small`
- SMS row: toggle is disabled (greyed knob, no track colour) with a `"Coming soon"` badge next to the label

#### Section 3 — Rate Limits

Three numeric fields:

| Config Key | Label | Unit | Default (prod) |
|---|---|---|---|
| `rate_limit.session_create_per_day` | Max sessions per Que Master per day | sessions/day | 10 |
| `rate_limit.join_requests_per_hour` | Max join requests per player per hour | requests/hour | 5 |
| `rate_limit.review_submissions_per_match` | Max review submissions per player per match | per match | 1 |

- Each field: numeric input (no decimal), height 40px, width 120px (right-aligned in row), `color-bg-elevated` bg, `radius-md`, `color-border` border
- Label and unit hint displayed in the same row as the input
- Min value: 1 for all fields; no max enforced in UI (server validates)
- In `dev`: fields show relaxed defaults with a note: `"Rate limits are relaxed in development."`

#### Section 4 — WebSocket Config

Two numeric fields:

| Config Key | Label | Unit |
|---|---|---|
| `websocket.reconnect_max_attempts` | Max reconnect attempts | attempts |
| `websocket.heartbeat_interval_ms` | Heartbeat interval | ms |

- Same numeric input styling as Rate Limits
- Helper text below each field: `text-micro`, `color-text-disabled`
  - `reconnect_max_attempts`: `"Number of reconnect attempts before the client shows an offline state to the user."`
  - `heartbeat_interval_ms`: `"Interval in milliseconds between WebSocket ping frames. Lower values reduce latency detection but increase server load."`

### Danger Zone

- Located at the bottom of the configuration panel, visually separated by a 1px `color-border` divider with a `"Danger Zone"` label (`text-small`, `color-error`, uppercase)
- Contains a single action: **Refresh Data from Production**
  - Only rendered (and enabled) on the **Staging Admin App**
  - On the Prod or Dev Admin App: the section is rendered but the action button is permanently disabled with the tooltip: `"Only available on the Staging environment."`
  - Button: `color-error` border, `color-error` label (`text-label`), `color-bg-surface` background (outline style), height 40px, `radius-md`
  - Label: `Refresh Data from Production`
  - Description below button: `text-small`, `color-text-secondary` — `"Replaces the staging database with an anonymised snapshot of production. All current staging data will be permanently overwritten. Requires Super Admin."`
  - Clicking triggers the Data Sync Confirmation Modal (see Modals section)
  - If the logged-in admin is not a Super Admin: button is disabled with tooltip `"Requires Super Admin privileges."`

### Audit Log Panel (35% width)

Right column. Read-only history of configuration changes for this environment.

- Background: `color-bg-surface`; left border: 1px `color-border`; `radius-lg` (right side only); `space-5` padding
- Section label: `Recent Changes` — `text-small`, uppercase, `color-text-disabled`
- Log entries — each entry:
  - Timestamp: `text-small`, `color-text-disabled` (full UTC)
  - Admin name: `text-small`, `color-text-primary`
  - Config key changed: `text-mono` (13px), `color-text-secondary`
  - Old → New value: `"old_val → new_val"` — `text-small`, `color-text-secondary`; long values truncated with ellipsis
  - Optional note: italicised `text-small`, `color-text-secondary`
  - Entries separated by 1px `color-border`
- Shows most recent 20 entries; `"View all →"` link at bottom (`text-small`, `color-accent`)
- Empty state: `"No configuration changes recorded."` — `text-small`, `color-text-disabled`, centered

---

## Modals

### Save Confirmation — Production Only

Triggered when the Save button for any section is clicked while the environment is `prod`.

```
┌──────────────────────────────────────────────────┐
│  Save changes to PRODUCTION?                     │
│  ─────────────────────────────────────────────   │
│  You are about to save changes to:               │
│  App URLs  (1 field modified)                    │
│                                                  │
│  This will take effect immediately for all live  │
│  users and platform services.                    │
│                                                  │
│  Enter your password to confirm:                 │
│  [ ________________________________________ ]    │
│                                                  │
│  [  Cancel  ]           [ Save to Production ]   │
└──────────────────────────────────────────────────┘
```

- Same card styling as Kill Switches confirmation modal
- **Title:** `"Save changes to PRODUCTION?"` — `text-heading`, `color-text-primary`
- **Body:** Lists the section name and count of modified fields; impact statement
- **Password input:** same input styling as Login; type `password`; required before the confirm button becomes active
- **Cancel button:** `color-bg-elevated`, `color-text-primary`
- **Confirm button:** `color-error` background, white label `"Save to Production"`, disabled until password entered
- On non-prod environments: the save action bypasses this modal entirely (no password confirmation required)

### Save Confirmation — Non-Production

A simple inline toast appears (no modal): `"Changes saved."` — `color-accent-subtle` background, `color-accent` text, `text-small`, `radius-md`, slides in from top, auto-dismisses after 3 seconds.

### Data Sync Confirmation Modal (Staging only)

```
┌──────────────────────────────────────────────────────┐
│  ⚠ Refresh staging data from production?             │
│  ──────────────────────────────────────────────────  │
│  This action will:                                   │
│  • Replace all staging data with an anonymised       │
│    snapshot of the production database               │
│  • Strip all PII (names hashed, emails removed)      │
│  • Permanently overwrite the current staging dataset │
│  • Cannot be undone                                  │
│                                                      │
│  Estimated duration: 5–15 minutes. The Staging app   │
│  will be in read-only mode during the sync.          │
│                                                      │
│  Enter your password to confirm:                     │
│  [ __________________________________________ ]      │
│                                                      │
│  [  Cancel  ]    [ Refresh Staging Data → ]          │
└──────────────────────────────────────────────────────┘
```

- Warning icon (24px stroke, `color-warning`) in title
- Bulleted impact list — `text-body`, `color-text-secondary`
- Duration estimate — `text-small`, `color-text-disabled`
- Password field required
- Confirm button: `color-warning` background, dark label `"Refresh Staging Data →"`
- After confirm: a full-page progress overlay shows on the Staging Admin App: `"Data sync in progress. Staging is in read-only mode. This will take approximately 5–15 minutes."` — non-dismissable until sync completes

---

## States

### No Unsaved Changes
All Save buttons are disabled (greyed out). Fields display their last-saved values.

### Unsaved Changes Present
The section's chevron header shows an orange dot (8px, `color-warning`). The relevant Save button becomes active. If the admin attempts to navigate away (clicking a sidebar item) without saving, a browser-level confirmation prompt fires: `"You have unsaved changes. Leave anyway?"`.

### Save In Progress
Save button enters loading state (spinner replaces label). All fields in the section become non-interactive.

### Save Success (non-prod)
Toast notification. Fields reflect the newly saved values. Audit log panel updates with the new entry.

### Save Success (prod)
Modal dismisses. Toast notification. Audit log panel updates.

### Save Error (validation)
Inline error below the offending field. Modal (if open) stays open. Toast: `"Save failed. Please fix the errors and try again."` — `color-error-subtle` bg.

### Sync In Progress (Staging)
Full-page overlay as described in the modal section. Sidebar navigation is still accessible (the overlay only covers the main content area) but all save actions across the entire Staging Admin App are blocked.

---

## Responsive Layout

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Two-panel layout: config (65%) + audit log (35%) |
| Desktop (compact) | 1024px–1279px | Same two-panel; audit log reduces to 30% |
| Tablet | 768px–1023px | Single column; audit log moves below config panel |
| Mobile | < 768px | Not supported |

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-surface` | Section cards, audit log panel |
| `color-bg-elevated` | Input backgrounds, cancel buttons |
| `color-border` | Section separators, panel border, input borders |
| `color-accent` | Save buttons (non-danger), CTA links, success toast |
| `color-accent-subtle` | Success toast background |
| `color-error` | Danger Zone elements, prod save button, validation errors |
| `color-error-subtle` | Error toast background |
| `color-warning` | Unsaved changes dot, data sync confirm button, notification suppression banner |
| `color-warning-subtle` | Notification suppression banner background |
| `color-text-primary` | Field values, section labels, modal titles |
| `color-text-secondary` | Field labels, helper text, audit entries |
| `color-text-disabled` | Audit log headers, helper micro copy |
| `shadow-modal` | Confirmation modal card |
| `radius-xl` 20px | Modal card |
| `radius-lg` 14px | Section cards, audit log panel |
| `radius-md` 10px | Inputs, buttons |
| `text-body` 15px | Section labels, row labels, modal body |
| `text-small` 13px | Field labels, helper text, audit entries |
| `text-mono` 13px | Config key names in audit log |
| `text-micro` 10px | Helper sub-copy |
