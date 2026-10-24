# View: Admins (platform team management)

## Purpose

This page is a **filtered lens** over the single [`profiles`](../../database/01_users_and_profiles.md) table — the same table as the [player directory](./users.md). **There is no separate “admin” table:** platform Admin and Super Admin are rows in `profiles` with `admin_role` set.

This lens shows **`profiles` where `admin_role IS NOT NULL`**. It adds directory and lifecycle controls for the internal platform team: Super Admins invite admins, change roles, deactivate or reactivate accounts, force sign-out, and audit actions.

An admin profile **may also** be a club owner or que master in the Client App. Those facts surface as **Tags** on each row (Club owner, Que master) alongside platform **Role** (Admin / Super admin). **`Deactivated`** appears when `admin_is_active = false` or when moderation suspension applies — see [`../../database/01_users_and_profiles.md`](../../database/01_users_and_profiles.md).

The complementary lens — players **without** platform admin roles — lives under [`./users.md`](./users.md) (`admin_role IS NULL`).

The full lifecycle, schema, guards, and API contract are documented in [`../../business_logic/admin_app/08_user_management.md`](../../business_logic/admin_app/08_user_management.md). This doc covers the **UI**.

## Routes

| Path | Purpose |
|------|---------|
| `/admin/admins` | Directory of platform admin accounts |
| `/admin/admins/[id]` | Detail page for a single admin (profile + activity) |

## Roles

| Role | Access |
|------|--------|
| Super Admin | Full directory + all mutations (invite, role change, deactivate, reactivate, force sign-out, resend invite) |
| Platform Admin | Read-only directory + read-only detail page; cannot mutate; `Add admin` button hidden |
| Inactive admin | Blocked by middleware before reaching this route |

The **founding Super Admin** can be viewed but never deactivated, demoted, or removed by any UI flow — server-side guards reject the request even if a Super Admin attempts it. A `last active Super Admin` guard layers on top: any operation that would leave zero active Super Admins is rejected with 403.

---

## Layout

Standard admin shell (sidebar + environment bar + page header) with a stats strip, then a single full-width directory table.

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  SIDEBAR (240px)    │  ● PRODUCTION                              Admin ▾   │
│                     ├──────────────────────────────────────────────────────┤
│  [▪] Dashboard      │  Platform admins                  [ + Add admin ]    │
│  [▪] Kill Switches  │  Directory of internal admin accounts with role and  │
│  [▪] Environments   │  status controls.                                    │
│  [▪] Approvals      │                                                      │
│  [▪] Moderation     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  [▪] Users          │  │  Total   │ │ Active   │ │ Invited  │ │Inactive│  │
│  [▪] Admins  ←      │  │   12     │ │    9     │ │    2     │ │   1    │  │
│  [▪] Platform       │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│       Config        │                                                      │
│  [▪] Analytics      │  Directory                                           │
│                     │  Search and filter platform admin accounts.          │
│                     │                                                      │
│                     │  [ 🔍 Search by name or email ___________ ] [Role ▾] │
│                     │                                              [Status]│
│                     │  ┌──────────────────────────────────────────────────────┐  │
│                     │  │ Name    │ Email   │ Role │ Tags (CO/QM/D) │ Status │ ⋯ │  │
│                     │  │─────────┼─────────┼──────┼────────────────┼────────┼───│  │
│                     │  │ Jose B. │ jose@…  │Super │ CO             │ Active │ ⋯ │  │
│                     │  │ Maria R.│ maria@… │Admin │ —              │ Active │ ⋯ │  │
│                     │  │ Carlos D│ carlos@…│Admin │ QM             │Invited │ ⋯ │  │
│                     │  │ Alex S. │ alex@…  │Admin │ CO · D         │Inactive│ ⋯ │  │
│                     │  └──────────────────────────────────────────────────────┘  │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## Components

### Page Header

- Page title: `Platform admins` — `text-title` (20px, SemiBold), `color-text-primary`
- Subtitle: `Directory of internal admin accounts with role and status controls.` — `text-body`, `color-text-secondary`
- Right-aligned **`+ Add admin`** primary button — `color-accent` bg, white label, `radius-md`, height 40px
  - Hidden when caller is not Super Admin
  - Click → opens **Invite Admin** dialog (see below)

### Stats Strip

Four KPI cards in a horizontal flex row, `space-4` gap.

Each card:
- Background: `color-bg-surface`
- Border: 1px solid `color-border`
- Border radius: `radius-lg`
- Padding: `space-4`
- **Label:** `text-label` (12px, uppercase), `color-text-secondary`
- **Value:** `text-heading` (24px, SemiBold)

Cards (left to right):
1. **Total** — count of all admin profiles regardless of state — `color-text-primary`
2. **Active** — `admin_is_active = true` — `color-accent` (positive)
3. **Invited** — open `admin_invitations` row, status `pending` — `color-text-secondary`
4. **Inactive** — `admin_is_active = false` and no open invitation — `color-text-secondary`

### Directory Table

Single full-width table. Read for everyone; row actions visible only to Super Admins.

**Toolbar (above table):**
- Left: search input (`🔍 Search by name or email`) — debounced 300ms; matches against `profiles.name` and `profiles.email`
- Right: two filter dropdowns — **Role** (`All`, `Super admin`, `Admin`) and **Status** (`All`, `Active`, `Invited`, `Inactive`)

**Columns (left → right):**

| Column | Source | Notes |
|--------|--------|-------|
| Name | `profiles.name` | `text-body`, `color-text-primary`; avatar (32×32 circle, initials, `radius-full`) inline |
| Email | `profiles.email` | `text-small`, `color-text-secondary`; truncates with ellipsis at column max width |
| Role | `profiles.admin_role` | Pill badge — `Super admin` = `color-accent-subtle` bg + `color-accent` text; `Admin` = `color-bg-elevated` bg + `color-text-secondary` text |
| **Tags** | derived | Optional pills **Club owner** (**CO**), **Que master** (**QM**), **Deactivated** (**D**). Same derivation rules as [`./users.md`](./users.md) and [`../../database/01_users_and_profiles.md`](../../database/01_users_and_profiles.md). Order when multiple: **Club owner** → **Que master** → **Deactivated**. Omit absent tags; show `—` when none. |
| Status | derived | Pill badge — `Active` = `color-accent-subtle` + `color-accent`; `Invited` = `color-warning-subtle` + `color-warning`; `Inactive` = `color-bg-elevated` + `color-text-disabled` |
| Invited | `admin_invited_at` | Relative time (`"3 weeks ago"`); full timestamp on hover |
| Last active | derived from `admin_action_log` | Relative time, or `Never` if no action ever logged for this admin (`text-small`, `color-text-secondary`) |
| Actions | — | Kebab `⋯` button → row menu (Super Admin only) |

**Note:** **Role** here is always platform admin (`admin` / `super_admin`). **Tags** capture overlapping Client App hats (owner / que master) and **Deactivated** (inactive admin account or active moderation suspension, per derivation rules).

**Row interactions:**
- Hover: `color-bg-elevated` background
- Click anywhere on the row (except the kebab) → navigates to `/admin/admins/[id]`
- The row representing the **founding Super Admin** is rendered with a small `★ Founding` micro-badge next to the name and the kebab menu shows only `Copy email` and `View details`

**Row kebab menu (Super Admin only, action availability depends on row state):**

| Action | Shown when | Effect |
|--------|------------|--------|
| Copy email | Always | Copies email to clipboard; toast `"Email copied"` |
| View details | Always | Navigates to `/admin/admins/[id]` |
| Resend invite | `Status = Invited` (also when `pending` invite has expired) | Revokes any existing pending row, inserts a fresh one, re-issues the invite email; toast `"Invite resent"` |
| Change role | Always (except founding Super Admin) | Opens **Change role** dialog |
| Deactivate | `Status = Active` AND not founding AND not the only active Super Admin | Opens **Deactivate** confirm dialog; on confirm sets `admin_is_active = false` and force-revokes the target's Supabase sessions |
| Reactivate | `Status = Inactive` AND no open invitation | Opens **Reactivate** confirm dialog; on confirm sets `admin_is_active = true` |
| Force sign-out | `Status = Active` | Opens confirm dialog; on confirm revokes all Supabase sessions for the target without otherwise changing role or active status |
| Delete user | `Role = Admin` AND not self | Opens **Delete user** confirm dialog; on confirm deletes the auth user (cascade removes `profiles`); row disappears from the directory (list joins `auth.users`) |

Disabled actions are rendered greyed-out with a tooltip explaining the guard (e.g. `"Cannot demote the only active Super Admin."`).

### Empty / Loading / Error States

- **Initial load:** stats strip and table render skeletons (`color-bg-elevated`, `radius-md`) for ~150ms; live data slides in.
- **No matches for filter / search:** centered message inside the table area — `"No admins match the current filters."` — `text-body`, `color-text-disabled`. A `[ Clear filters ]` link below resets state.
- **API error:** inline banner above the table — `color-error-subtle` bg, `color-error` text — `"Couldn't load the admin directory. Try refreshing."` with a `[ Retry ]` button.

---

## Invite Admin Dialog

Triggered by `+ Add admin`. Modal card on top of a 50% black scrim.

```
┌──────────────────────────────────────────┐
│  Invite a new admin                      │
│  ──────────────────────────────────────  │
│                                          │
│  Full name                               │
│  [ ___________________________________ ] │
│                                          │
│  Email                                   │
│  [ ___________________________________ ] │
│                                          │
│  Role                                    │
│  ◉ Admin    ○ Super admin                │
│                                          │
│  ────────────────────────────────────    │
│                  [ Cancel ] [ Send invite ]│
└──────────────────────────────────────────┘
```

- Card: `color-bg-surface`, `radius-xl`, `shadow-modal`, max-width 480px, `space-6` padding
- Title: `text-title`, `color-text-primary`
- All inputs: 40px height, `color-bg-elevated` bg, `color-border` border, `radius-md`
- Validation:
  - Name: required, min 2 chars
  - Email: required, must be valid format, must not match an existing admin profile's email, must not have an open `pending` admin invitation
- Submit (`Send invite`): disabled until valid; on click POSTs `/api/admin-users/invite`. On success: toast `"Invite sent to <email>."`, dialog closes, directory refreshes, the new row appears with `Status = Invited`.

---

## Admin Detail Page

Route `/admin/admins/[id]`. Read-only for non-Super Admins; Super Admins see action controls.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← All admins                                                            │
│                                                                          │
│  [Av]  Maria Reyes                          [ Change role ] [ Deactivate]│
│        maria@example.com                                                 │
│        Admin · Active · Invited 3 weeks ago by Jose B.                   │
│                                                                          │
│  ── Account ────────────────────────────────────────────────────────     │
│  Profile id        u_abc123                                              │
│  Auth provider     Supabase email                                        │
│  Last active       Mar 30, 2026 09:18 (2 hours ago)                      │
│                                                                          │
│  ── Activity by this admin ─────────────────────────────────────────     │
│  [ table of admin_action_log rows where admin_id = target ]              │
│                                                                          │
│  ── Activity on this admin ─────────────────────────────────────────     │
│  [ table of admin_action_log rows where entity_type = 'admin_user' AND   │
│    entity_id = target ]                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Header block
- **Back link:** `← All admins` — `text-small`, `color-accent`
- **Avatar:** 56×56 circle, initials-based, `radius-full`, `color-accent-subtle` bg, `color-accent` text
- **Name:** `text-title`, `color-text-primary`
- **Email:** `text-body`, `color-text-secondary`
- **Tags row (optional):** Same Club owner / Que master / Deactivated pills as the directory when applicable.
- **Meta line:** Role pill · Status pill · `Invited <relative> by <inviter name>` — `text-small`, `color-text-secondary`. Inviter name links to that admin's detail page.
- **Action buttons (right):** Same set as the row kebab on the directory, rendered as buttons. Visible only to Super Admin; same disabled-state logic and tooltips. Founding Super Admin shows `★ Founding Super Admin — protected` instead of the action buttons.

### Account block
Two-column label/value list:
- `Profile id` — monospace, with a copy-to-clipboard icon
- `Auth provider` — `Supabase email` for now (single provider on Admin App)
- `Last active` — derived from `admin_action_log` (max `created_at WHERE admin_id = target`)
- `Activated at`, `Deactivated at`, `Deactivated by` — shown when the relevant timestamps are set; `Deactivated by` links to the actioning admin's detail page

### Activity panels

Two filtered tables off the same `admin_action_log` source, side by side on desktop, stacked on tablet:

**Activity by this admin** — `admin_id = target.id`. What this admin has done.
**Activity on this admin** — `entity_type = 'admin_user' AND entity_id = target.id`. What has been done to this admin.

Both tables share columns: `Time` · `Action` · `Entity` · `Note` (truncated, full on hover). Row height 40px; alternating `color-bg-base` / `color-bg-surface`. Each table paginates at 20 rows with a `[ Load more ]` button.

---

## Confirmation Dialogs

All mutating actions go through a confirm dialog. Same shell as the Invite dialog but smaller (max-width 400px).

| Action | Title | Body | Confirm label | Confirm bg |
|--------|-------|------|----------------|-----------|
| Resend invite | `Resend invite to <name>?` | `"They will receive a new invitation email. Any previous invitation link will stop working."` | `Resend invite` | `color-accent` |
| Change role | `Change role for <name>?` | Inline radio (`Admin` / `Super admin`) + `"They will be signed out so the new role takes effect on their next sign-in."` | `Change role` | `color-accent` |
| Deactivate | `Deactivate <name>?` | `"They will be signed out immediately and will not be able to sign back in until reactivated."` | `Deactivate` | `color-error` |
| Reactivate | `Reactivate <name>?` | `"They will be able to sign in using their existing password."` | `Reactivate` | `color-accent` |
| Force sign-out | `Force sign-out <name>?` | `"All active Admin App sessions for this account will end immediately. Their role and active status are unchanged."` | `Sign them out` | `color-error` |
| Delete user | `Delete <name>?` | `"This permanently removes their account and sign-in. Past audit-log entries may show '[deleted admin]' for the actor. This cannot be undone."` | `Delete user` | `color-error` |

All dialogs:
- Disable the confirm button while the API call is in flight; show a small inline spinner inside the button
- On success: close, toast a confirmation, and refresh the directory + detail page
- On error: keep the dialog open and display the API error inline above the buttons in `color-error`

---

## States

### Caller is Super Admin
Full UI: `+ Add admin`, kebab menus, header action buttons all rendered.

### Caller is Platform Admin (read-only)
- `+ Add admin` button hidden
- Row kebab menu shows only `Copy email` and `View details`
- Detail page renders without action buttons

### Founding Super Admin row
- `★ Founding` badge next to name in the directory
- Detail page shows `★ Founding Super Admin — protected` block in place of action buttons; tooltip on hover: `"This account is the platform's safety floor and cannot be modified through the UI."`
- `Delete user` never appears for this row because deletion is limited to platform `Admin` rows only.

### Last active Super Admin
- Any action that would leave zero active Super Admins is disabled with a tooltip: `"Cannot demote/deactivate the only active Super Admin."` — applies to `Change role` (when changing Super → Admin), `Deactivate`, and the Force sign-out action when applied to themselves
- Server-side guard returns 403 if the UI is bypassed

### Pending invite expired
- Status pill remains `Invited` but a small `(expired)` micro-label appears next to it in `color-warning`
- `Resend invite` is the recommended action

---

## Responsive Layout

| Breakpoint | Range | Layout |
|---|---|---|
| Desktop (primary) | ≥ 1280px | Full layout as described above; activity panels side-by-side on detail page |
| Desktop (compact) | 1024px–1279px | Stats strip remains 4-across; directory table hides the `Invited` column; activity panels remain side-by-side |
| Tablet | 768px–1023px | Sidebar hidden; stats strip wraps to 2×2; table reduces to Name + Role + Status + ⋯ (other columns accessible via row expand); detail page stacks activity panels vertically |
| Mobile | < 768px | Not supported — same notice as the rest of the Admin App |

---

## Cross-links

- Business logic & schema: [`../../business_logic/admin_app/08_user_management.md`](../../business_logic/admin_app/08_user_management.md)
- Player directory (other lens, `admin_role IS NULL`): [`./users.md`](./users.md)
- Login flow that consumes the invite: [`./login.md`](./login.md)
- Audit log (full read-only browser of `admin_action_log`): [`./audit_log.md`](./audit_log.md)
- Profile schema (`profiles.admin_role`, lifecycle columns): [`../../database/01_users_and_profiles.md`](../../database/01_users_and_profiles.md)

---

## Design Tokens

| Token | Usage |
|---|---|
| `color-bg-base` | Page background, alternating activity-table rows |
| `color-bg-surface` | Stat cards, table container, modal cards, alternating activity-table rows |
| `color-bg-elevated` | Row hover, input backgrounds, secondary buttons |
| `color-border` | Card borders, table borders, input borders |
| `color-accent` | Primary buttons, Active/Super-admin badges, links |
| `color-accent-subtle` | Active badge bg, Super-admin badge bg, avatar bg |
| `color-warning` | Invited badge, expired-invite micro-label |
| `color-warning-subtle` | Invited badge background |
| `color-error` | Destructive confirm buttons, API error banners |
| `color-error-subtle` | Error banner background |
| `color-text-primary` | Names, KPI values, labels |
| `color-text-secondary` | Subtitles, metadata, table sub-text |
| `color-text-disabled` | Inactive badge text, empty-state copy |
| `shadow-modal` | Confirm and invite dialogs |
| `radius-xl` 18px | Modal cards |
| `radius-lg` 14px | Stat cards, directory table container |
| `radius-md` 10px | Buttons, inputs, dropdowns, row badges |
| `radius-full` | Avatars, pill badges |
| `text-title` 20px SemiBold | Page title, detail header name |
| `text-heading` 24px SemiBold | KPI values |
| `text-body` 15px | Names, dialog body copy |
| `text-small` 13px | Metadata, sub-lines, table sub-text |
| `text-label` 12px uppercase | KPI labels |
| `text-micro` 10px | Founding-admin badge, expired-invite micro-label |
