# View: Admin audit log

## Purpose

Read-only browser for **`admin_action_log`**: every significant admin write (approvals, demotions, kill switches, `platform_config`, moderation outcomes, complaint actions, one-click demotes). Supports investigation and compliance.

## Route

`/admin/audit-log` — authenticated admins only.

## Layout

- **Filters:** date range, admin actor, `action`, `entity_type`, free-text search on `entity_id` / note.
- **Table:** timestamp, admin display name, action, entity type + id (truncated with copy), optional note.
- **Row expand** or **side drawer:** pretty-printed JSON diff for `before_value` vs `after_value` (no size cap in product — UI should lazy-load large payloads).

## Behavior

- No edit/delete controls on rows (append-only store).
- Export filtered page to CSV (optional follow-up).

## Cross-link

[`../../database/12_club_governance.md`](../../database/12_club_governance.md) — `admin_action_log` table definition.
