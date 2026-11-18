# Player notifications

**Status:** Migration `20261118000400_player_notifications` and real-mode services implemented in source for [D-2026-11-16-03](../../../../mvp/decisions.md#d-2026-11-16-03). Prisma models live in the Player entity group.

## `player_notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `player_id` | UUID FK → `players` | The recipient. Index `(player_id, created_at desc)`. |
| `kind` | enum `announce`, `session`, `invite`, `club`, `rank`, `account` | |
| `title` | text | Rendered when written; no template engine. |
| `body` | text | One line. |
| `target` | text | App path the notification opens, e.g. `/players/<id>/games`. |
| `source_type`, `source_id` | text, UUID, nullable | The row that caused it (session, join request, contact-change request…). Unique `(player_id, kind, source_type, source_id)` so a retried event writes once. |
| `created_at` | timestamptz | |
| `read_at` | timestamptz, nullable | |

The source type and UUID must be present or absent together. All seven event writers supply both values and insert inside the event transaction. The source identifies the admission assessment, waitlist entry, publication event, rank job, club add operation, contact-change request or Admin verification audit event. The unique index deduplicates concurrent delivery. The recipient FK restricts player deletion.

RLS is enabled and table privileges are revoked from `anon`, `authenticated` and `PUBLIC`. The authenticated Player Route Handlers scope every read and read-state change to the signed-in player. The page refreshes on open and focus.

## Announcements

The pinned verification reminder is derived from #889. Its first read time uses the nullable `player_accounts.verification_reminder_read_at` timestamp. The reminder disappears when verification succeeds. Free-text announcements from Admin, if approved, would be one `announcements` row (title, body, target, audience, starts and ends) read by every matching player, with a per-player dismissal table. Not designed until the Admin screen is decided.

## Retention

Owner decision, November 18, 2026: list visibility is 90 days. Filter reads by creation time; automatic database deletion is deferred and would need the jobs decision in [backend open decisions](../../../../backend/open-decisions.md). Free-text announcements remain out of scope; only the derived verification reminder is approved.
