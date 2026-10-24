# View: Club Application (Create a Club)

## Purpose

Allows an authenticated player to apply for **a new club**. Each application is reviewed by a platform admin in the Admin app. On approval, a **`clubs`** row is created and the applicant becomes owner. Outcomes are delivered via in-app notifications (`club_application_approved`, `club_application_rejected`, optional `club_application_submitted`).

See [`../../../database/12_club_governance.md`](../../../database/12_club_governance.md) for schema and SLA rules.

## Route

`/clubs/apply` — authenticated players only. Optional query `?edit=` when editing an existing pending application (same screen, pre-filled).

## Roles

**Player** (any authenticated user may apply). Que Masters and existing club owners **may** still open this route to apply for an **additional** club (CTA remains available on `/clubs` per product spec).

---

## Layout

Full-screen scrollable single-column form in the authenticated shell (bottom nav + header). Same structural pattern as the legacy club-owner application view, extended with additional fields.

---

## Form fields (order)

| # | Field | Required | Max / type | Notes |
|---|--------|----------|------------|-------|
| 1 | Club name | Yes | 60 chars | Becomes `clubs.name` on approval |
| 2 | Club description | Yes | 300 chars | Becomes `clubs.description` |
| 3 | Intent (“Why do you want this club?”) | Yes | 500 chars | Internal / admin review; not copied to `clubs` |
| 4 | Location — city | Yes | free text | Shown on discovery cards for disambiguation |
| 5 | Location — venue name | Yes | free text | e.g. hall name |
| 6 | Venue address | Yes | free text | Full address for admin verification |
| 7 | Club Facebook page URL | No | URL | Optional club page |
| 8 | Your Facebook profile URL | No | URL | Optional; helps admin verify applicant |
| 9 | Contact number | No | text | Optional; `tel:` link for admin |
| 10 | Expected player count | Yes | enum buckets | `one_to_ten` … `hundred_plus` |
| 11 | Anything else we should know? | No | 500 chars | Optional catch-all |

Character counters on constrained text areas; validation errors inline.

---

## “What happens next” copy

- Explain admin review and **in-app notifications**.
- State **24-hour review window** from last save: if not reviewed in time, the application **auto-rejects** and the player may submit again immediately.

---

## States

| State | UI |
|-------|-----|
| Empty | Submit disabled until required fields valid |
| Valid | Submit enabled; optional confirmation modal |
| Submitting | Spinner; fields disabled |
| Success | Toast; navigate back (e.g. `/clubs` or `/profile/applications`) |
| Pending (read-only) | Banner “Under review”; show submitted data; link to `/profile/applications`; **Edit** re-opens form if edits allowed |
| Editing pending | All fields editable; primary CTA **Update application**; on success, `updated_at` resets SLA |
| Cancelled | After user cancels pending row — return to empty form or hide pending banner |
| Rejected | Show rejection reason summary + note; user may submit a **new** application when they have no other `pending` row |

---

## Modals

### Submit / update confirmation

- Title: e.g. `Submit your club application?`
- Body: confirms submission to ROTRA admin team; mention notifications.
- Primary **Confirm** / secondary **Cancel**

---

## Responsive layout

| Breakpoint | Range | Layout |
|------------|-------|--------|
| Mobile | &lt; 768px | Full-screen scroll, single column |
| Tablet | 768px–1023px | Single column, `max-width: 600px`, centered |
| Desktop | ≥ 1024px | Single column, `max-width: 640px`, centered; sidebar nav per Home spec |

Confirmation modal: centered overlay, `max-width: 480px` on desktop.

---

## Design tokens

Reuse tokens from the previous spec: `color-bg-base`, `color-bg-surface`, `color-accent`, `color-warning` for pending banner, `color-error` for validation, typography scale `text-title` / `text-heading` / `text-body` / `text-small`.

---

## Cross-links

- Hub CTA: [`../common/clubs_hub.md`](../common/clubs_hub.md)
- History: [`profile_applications.md`](./profile_applications.md)
- Database: [`../../../database/12_club_governance.md`](../../../database/12_club_governance.md)
