# Player notifications (proposal)

**Status:** proposed for [D-2026-11-16-03](../../../../mvp/decisions.md#d-2026-11-16-03); nothing is built. Prisma file when built: the Player Information entity group, not a shared schema file.

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

Written by the server services that already handle each event (join request decisions, publishing results, rank recompute, contact-change review, club saved-player adds). No Realtime channel: the page reads on open and on focus, like other Player reads.

## Announcements

Pinned ROTRA announcements that depend on the player's state (verification) are **derived on read**, not stored per player. Free-text announcements from Admin, if approved, would be one `announcements` row (title, body, target, audience, starts and ends) read by every matching player, with a per-player dismissal table. Not designed until the Admin screen is decided.

## Retention

Open. The mockup says 90 days; a scheduled delete would need the jobs decision in [backend open decisions](../../../../backend/open-decisions.md).
