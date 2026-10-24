# Admin App — 09 Notification broadcasts

## Overview

Platform **Super Admins** can fan out in-app notifications to cohorts defined by **`profile_tags`** and/or **`profiles.admin_role`**, optionally excluding specific profile ids (usually the actor). Each send creates:

1. One **`notification_broadcasts`** audit row (`packages/db/prisma/models_notifications.prisma`).
2. Zero or more **`notifications`** rows (player/client inbox) when `appScopes` includes `client`.
3. Zero or more **`admin_notifications`** rows (admin shell inbox) when `appScopes` includes `admin`.

Implementation lives in `@rotra/db`:

- `broadcastNotification` — wraps a transaction (API / scripts).
- `broadcastNotificationInTx` — same logic inside an existing interactive transaction (e.g. admin-user mutations).
- `broadcastNotificationByTags` — convenience wrapper with `{ audience: { tagSlugs } }` only.

HTTP (`apps/admin/src/app/api/notifications/broadcasts/route.ts`), **Super Admin only**:

- **`POST`** — JSON body mirrors `BroadcastNotificationInput` (+ ISO `scheduledAt` when scheduling client rows).
- **`GET`** — paginated audit list: query `page` (default 1), `limit` (default 20, max 50); returns `{ rows, page, limit, total, hasMore }`.

React Query (`apps/admin/src/hooks/useNotificationBroadcast/`):

- `useBroadcastNotification()` — POST mutation (invalidates broadcast list queries on success).
- `useNotificationBroadcastsQuery({ page, limit })` — GET list.
- `fetchNotificationBroadcasts` / `notificationBroadcastsListQueryKey` — server fetch + keys.

Database reference: [`../../database/07_notifications.md`](../../database/07_notifications.md).

---

## Worked example — admin lifecycle alerts

Every mutating path in [`packages/db/src/admin-user-service.ts`](../../../packages/db/src/admin-user-service.ts) notifies **all other active Super Admins** (`audience: { adminRoles: ['super_admin'], excludeProfileIds: [actorId] }`, `appScopes: ['admin']`, `adminNotificationType: 'admin_profile_changed'`, `notificationType: 'platform_announcement'` on the audit row for the client enum column).

| Action | Severity | Example deep link |
|--------|----------|-------------------|
| Invite | `info` | `/admins/{newProfileId}` |
| Resend invite | `info` | `/admins/{targetId}` |
| Change role | `warning` | `/admins/{targetId}` |
| Deactivate | `warning` | `/admins/{targetId}` |
| Reactivate | `info` | `/admins/{targetId}` |
| Force sign-out | `warning` | `/admins/{targetId}` |
| Delete admin | `urgent` | `/admins` |

Notifications share **`severity`** with the Client/Admin `NotificationItem` UI for accent + icons.

---

## Product rules

- **Union audience**: tag slugs OR admin-role selectors are combined; dedupe by profile id; then apply exclusions.
- **Admin inbox filter**: only resolved profiles with **`admin_role IS NOT NULL` AND `admin_is_active`** receive `admin_notifications`.
- **Client inbox**: every resolved profile receives `notifications` when `client` scope is requested (includes admins-as-players).
- **`targetUrl`** is required whenever **`admin`** is in `appScopes` (relative paths such as `/admins/…`).

---

## Related docs

- [`08_user_management.md`](./08_user_management.md) — admin directory mutations that emit these alerts.
- [`customer-detail-and-tags.md`](./customer-detail-and-tags.md) — internal cohort tags used as broadcast selectors.
- [`../../views/admin_app/admin_notifications.md`](../../views/admin_app/admin_notifications.md) — bell UI + severity mapping.
