# 07 — Notifications

## Overview

All in-app notifications are persisted in a single `notifications` table. This covers session reminders, in-session events (match assignment, umpire duty, waitlist promotion), post-session summaries, and club management events.

Notifications are inserted server-side (via Supabase Edge Functions or server actions) and read by the client via Supabase Realtime subscription. Push delivery (mobile) is out of scope for MVP — in-app only.

---

## Enum: `notification_severity_enum`

Matches Client + Admin notification row UI (`urgent`, `warning`, `info`):

```sql
CREATE TYPE notification_severity_enum AS ENUM ('urgent', 'warning', 'info');
```

---

## Enum: `notification_type_enum`

```sql
CREATE TYPE notification_type_enum AS ENUM (
  -- Session reminders (pre-session)
  'session_reminder_2h',
  'session_reminder_1h',
  'session_reminder_30m',
  'session_reminder_5m',
  'session_started',

  -- In-session events
  'match_assigned',          -- player is in the next match
  'umpire_assigned',         -- player has been assigned as umpire
  'score_near_limit',        -- Que Master: match nearing end (smart monitor)
  'match_completed',         -- all participants: submit your review
  'waitlist_promoted',       -- player moved from waitlist to accepted
  'payment_reminder',        -- player: settle your session fee

  -- Post-session
  'session_ended',
  'review_window_closing',   -- 2 hours left to submit review
  'leaderboard_published',

  -- Club events
  'join_request_result',     -- approved or rejected
  'direct_invite_received',  -- Club Owner sent a direct invite

  -- Club applications & governance (see 12_club_governance.md)
  'club_application_submitted',   -- optional receipt when player submits application
  'club_application_approved',
  'club_application_rejected',
  'club_demotion_completed',      -- former owner demoted / ownership ended for that club
  'club_closed',                  -- club archived; notify all members
  'complaint_submitted',          -- optional receipt to reporter (content-only; no resolution follow-up)

  -- Broadcasts & cohort sends
  'platform_announcement'
);
```

---

## Table: `notification_broadcasts`

Campaign / audit row for fan-out sends (tags, admin roles, or both). Referenced by `notifications.broadcast_id` and `admin_notifications.broadcast_id`.

```sql
CREATE TABLE notification_broadcasts (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type          notification_type_enum NOT NULL,
  admin_notification_type    admin_notification_type_enum NOT NULL,
  severity                   notification_severity_enum NOT NULL DEFAULT 'info',
  title                      text NOT NULL,
  body                       text NOT NULL,
  app_scopes                 text[] NOT NULL DEFAULT '{}',
  tag_slugs                  text[] NOT NULL DEFAULT '{}',
  recipient_count            int NOT NULL DEFAULT 0,
  related_entity_type        text,
  related_entity_id          uuid,
  target_url                 text,
  scheduled_at               timestamptz,
  created_by                 uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_broadcasts_created     ON notification_broadcasts(created_at DESC);
CREATE INDEX idx_notification_broadcasts_created_by ON notification_broadcasts(created_by);
```

### Audience rules

The server resolves recipients as the **union** of:

1. **Tags** — profiles owning **any** matching `profile_tags.slug`.
2. **Admin roles** — profiles with `profiles.admin_role IN (...)` **and** `admin_is_active = true`.

Then **`exclude_profile_ids`** removes ids (typically the actor). **Client scope** inserts into `notifications` for every resolved profile. **Admin scope** inserts into `admin_notifications` only for resolved profiles who are **active admins**.

See [`../business_logic/admin_app/09_notification_broadcasts.md`](../business_logic/admin_app/09_notification_broadcasts.md).

---

## Table: `notifications`

```sql
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type     notification_type_enum NOT NULL,
  severity notification_severity_enum NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body  text NOT NULL,

  is_read bool NOT NULL DEFAULT false,
  read_at timestamptz,

  -- Optional link back to a broadcast campaign (tag / role fan-out)
  broadcast_id uuid REFERENCES notification_broadcasts(id) ON DELETE SET NULL,

  -- Allows deep-linking from the notification to the relevant entity
  related_entity_type text,  -- e.g. 'session', 'match', 'club', 'review'
  related_entity_id   uuid,  -- FK to the related entity (not enforced at DB level for flexibility)

  -- For scheduled reminders: when this notification should be sent
  -- NULL = send immediately on insert
  scheduled_at timestamptz,
  sent_at      timestamptz,

  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### Notes

- **`severity`** drives accent treatment in notification UI (`urgent` / `warning` / `info`).
- **`broadcast_id`** links a row back to a fan-out campaign when applicable (otherwise `NULL`).
- **Scheduled notifications** (e.g. session reminders at 2h, 1h, 30m, 5m) are inserted with a `scheduled_at` timestamp. A Supabase Edge Function runs on a cron schedule, queries for unsent notifications where `scheduled_at <= now()` and `sent_at IS NULL`, sends them, and updates `sent_at`.
- **Immediate notifications** have `scheduled_at = NULL` and are treated as "send now" — `sent_at` is populated on insert.
- `related_entity_type` + `related_entity_id` enable the client to navigate to the correct screen on tap. No FK constraint is added here because `related_entity_id` may reference any of several tables.
- `is_read` is toggled client-side when the player opens the notification center or taps a specific notification.
- Notifications are **never deleted** — they are the player's notification history. Old notifications may be soft-archived in a future phase.

### Notification Content Examples

| Type | Title | Body |
|---|---|---|
| `session_reminder_2h` | "Session in 2 hours" | "Your session at [venue] starts in 2 hours." |
| `session_reminder_1h` | "Session in 1 hour" | "1 hour until your session at [venue]." |
| `session_reminder_30m` | "Session starting soon" | "Your session starts in 30 minutes. Head to [venue]." |
| `session_reminder_5m` | "Session starting now" | "Your session is starting! Head to the court." |
| `session_started` | "Session has started" | "Your session at [venue] has begun. Mark yourself as In." |
| `match_assigned` | "You're up next" | "You're playing on Court [X]. Get ready!" |
| `umpire_assigned` | "Umpire duty" | "You're umpiring the next match on Court [X]." |
| `score_near_limit` | "Match nearing end" | "Match on Court [X] is at [score]/[limit]. Prepare next match." |
| `match_completed` | "Match complete" | "Submit your player reviews. Window closes in 24 hours." |
| `waitlist_promoted` | "You're in!" | "A slot opened up. You've been accepted into the session." |
| `payment_reminder` | "Payment due" | "Please settle your session fee with the Que Master." |
| `session_ended` | "Session over" | "View the final leaderboard for [session name]." |
| `review_window_closing` | "2 hours left" | "Submit your match reviews before the window closes." |
| `leaderboard_published` | "Final standings live" | "The final leaderboard for [session] is now published." |
| `join_request_result` | "Join request update" | "Your request to join [club name] was approved / rejected." |
| `direct_invite_received` | "Club invitation" | "[Club Owner name] has invited you to join [club name]." |
| `club_application_submitted` | "Application received" | "Your club application has been submitted for review." |
| `club_application_approved` | "Club approved" | "Your club application was approved. [Club name] is ready." |
| `club_application_rejected` | "Application update" | "Your club application was not approved. [Reason summary]." |
| `club_demotion_completed` | "Ownership update" | "Your ownership of [club name] has ended." |
| `club_closed` | "Club closed" | "[Club name] has been closed. Thank you for playing with the community." |
| `complaint_submitted` | "Report received" | "We received your report. Our team will review it." |
| `platform_announcement` | "[Title]" | "[Body]" — cohort / manual broadcast |

### Indexes

```sql
CREATE INDEX idx_notifications_recipient_id  ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read       ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_scheduled_at  ON notifications(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND sent_at IS NULL;
CREATE INDEX idx_notifications_type          ON notifications(type);
CREATE INDEX idx_notifications_created_at    ON notifications(created_at DESC);
CREATE INDEX idx_notifications_broadcast_id ON notifications(broadcast_id);
```

---

## Session Reminder Scheduling

When a session is created with a `date_time`, the server inserts scheduled reminder rows automatically:

```sql
-- Inserted for each accepted player when they join (or when session is created)
INSERT INTO notifications (recipient_id, type, title, body, related_entity_type, related_entity_id, scheduled_at)
VALUES
  (:player_id, 'session_reminder_2h',  ..., :session_id, :date_time - INTERVAL '2 hours'),
  (:player_id, 'session_reminder_1h',  ..., :session_id, :date_time - INTERVAL '1 hour'),
  (:player_id, 'session_reminder_30m', ..., :session_id, :date_time - INTERVAL '30 minutes'),
  (:player_id, 'session_reminder_5m',  ..., :session_id, :date_time - INTERVAL '5 minutes');
```

When a player is moved from `waitlisted → accepted`, the same reminder rows are inserted. If a player exits or the session is cancelled, their pending scheduled notifications are soft-cancelled by setting `sent_at = now()` (so the cron job skips them) and updating the body to a cancellation message — or alternatively, a hard delete of unsent reminders is acceptable here since they are operational, not historical.

---

## Realtime

The `notifications` table is published to Supabase Realtime with a filter on `recipient_id`. Each client subscribes only to their own notifications:

```js
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe()
```

---

## Relationships

```
profiles ──► notifications (1:many via recipient_id)
profiles ──► notification_broadcasts (1:many via created_by, nullable)
notification_broadcasts ──► notifications (1:many via broadcast_id, nullable)
```

`related_entity_id` may reference `queue_sessions`, `matches`, `clubs`, or `match_reviews` — resolved at the application layer by `related_entity_type`.

Admin inbox (`admin_notifications`) is documented in [`08_admin.md`](08_admin.md) / [`12_club_governance.md`](12_club_governance.md); it mirrors **`severity`**, **`broadcast_id`**, and uses `admin_notification_type_enum` (includes `platform_announcement`, `admin_profile_changed`).
