# View: My Club Applications

## Purpose

History of **`club_applications`** submitted by the logged-in player: pending, approved, rejected (including SLA auto-reject), and cancelled. Approved rows link to the resulting club; if that club is **archived**, show a **Club closed** badge on the history row.

## Route

`/profile/applications` — authenticated only.

## Roles

**Player** (all authenticated users).

---

## Layout

- Page title: **Applications** or **My club applications**.
- List or table sorted by **newest first** (default).
- Each row: club name (requested), location city, status pill, submitted / updated date, optional link **View club** when `resulting_club_id` exists and club is active.
- **Badges:** `Pending`, `Approved`, `Rejected`, `Cancelled`, **Club closed** (when approved club is archived).
- Row tap → detail sheet or inline expansion with full submitted payload (read-only).

---

## Empty state

No applications yet — short copy + button **Apply to start a club** → `/clubs/apply`.

---

## Cross-links

- Apply: [`club_application.md`](./club_application.md)
- Database: [`../../../database/12_club_governance.md`](../../../database/12_club_governance.md)
