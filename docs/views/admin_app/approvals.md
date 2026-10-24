# View: Approvals (Club applications & demotions)

## Purpose

Primary admin surface for **reviewing `club_applications`** (mint new clubs) and **`club_demotion_requests`** (transfer ownership, archive, reject). Replaces ad-hoc email review. See [`../../database/12_club_governance.md`](../../database/12_club_governance.md) and [`../../business_logic/admin_app/04_approvals_and_moderation.md`](../../business_logic/admin_app/04_approvals_and_moderation.md).

## Routes

| Path | Tab |
|------|-----|
| `/admin/approvals` | Redirect to **Club applications** (default) |
| `/admin/approvals/club-applications` | Club application queue |
| `/admin/approvals/demotions` | Demotion queue |

## Roles

Platform Admin, Super Admin.

---

## Global layout

- **Desktop:** Two-column split pane — queue (~45%) + detail (~55%), as in previous wireframes.
- **Mobile / narrow:** **Stacked layout** — queue full width on top; selecting a row opens the detail pane **below** (or as a full-width sheet with back affordance). No “unsupported on mobile” — admin must be usable on phone.

### Page chrome

- Horizontal **tabs** under the page title: `[ Club applications ] [ Demotions ]`.
- Optional third nav entry **Audit log** may link to [`audit_log.md`](./audit_log.md) (`/admin/audit-log`) instead of duplicating log UI here.

---

## Tab: Club applications

### Queue controls

- **Filters:** Pending (default), In review, Approved, Rejected, All.
- **Sort:** Newest first (default), Oldest first, **Longest waiting** (by `updated_at` ascending for pending — surfaces SLA risk).
- **SLA indicator:** per pending row, show time remaining until **24h auto-reject** from `updated_at`.

### Queue row

Applicant name, requested club name, city, submitted/updated relative time, status pill.

### Detail pane

- Applicant header + **View profile** (opens client profile in new tab).
- Full application payload: description, intent, venue fields, URLs, phone, expected bucket, notes.
- **Collision warning** banner when other clubs share the same name — list city, owner, status, approved date.
- **Player activity** summary (sessions, matches, clubs, tier) — optional for MVP richness.
- **Previous applications** for same player (link to filtered history).

### Actions

- **Approve** → confirmation modal → creates `clubs` row, sets `resulting_club_id`, logs `admin_action_log`, notifies `club_application_approved`.
- **Reject** → modal with **required** `application_rejection_reason_enum` + optional note → notifies `club_application_rejected`.
- **Bulk reject** (multi-select rows): single reason + note applied to all selected pending rows.
- **Export CSV** of visible queue (respects filter/sort).

**No bulk approve.**

---

## Tab: Demotions

### Queue

Columns: Club, current owner, requester + role (`owner_self` / `member` / `admin`), status, submitted time, linked complaint (if any).

### Detail

- Reason text, evidence URL, complaint deep link.
- **Resolution:**
  - **Transfer** — dropdown: Que Masters (active) first, then other active members; confirm.
  - **Archive club** — confirm; notifies all members `club_closed`.
  - **Reject** — `demotion_rejection_reason_enum` + optional note.
- **One-click admin demote** (toolbar): shortcut into archive or transfer with minimal steps; must still write **`admin_action_log`**.

---

## Modals

Reuse modal card spec from prior doc: `shadow-modal`, `radius-xl`, `color-bg-surface`, max-width ~440–480px; primary/secondary buttons consistent with Admin design system.

---

## Design tokens

Use existing admin tokens: `color-bg-base`, `color-bg-surface`, `color-accent`, `color-error`, `color-warning`, `color-border`, `text-heading`, `text-body`, `text-small`.

---

## Cross-links

- Admin notifications: [`admin_notifications.md`](./admin_notifications.md)
- Audit log: [`audit_log.md`](./audit_log.md)
- Client application form: [`../client_app/player/club_application.md`](../client_app/player/club_application.md)
