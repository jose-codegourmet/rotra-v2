# Sign-in tables for the Go API

Track go-sign-in task 1.1 ([B-62](../../../../../docs/backend/open-decisions.md), [B-36](../../../../../docs/backend/open-decisions.md)).
Design: [sign-in](../../../../../docs/database_design/product/sign-in.md). Not applied to any shared
database; staging first, then Supabase production, each with owner sign-off.

## What it adds (purely additive)

| Table | Notes |
|---|---|
| `auth_identities` | One row per account that can sign in. Unique `(audience, login_key)`. UUIDv7 ids are app-generated (no default) |
| `auth_sessions` | The signed-in device list. `fillfactor = 90`, unique refresh digests (32 bytes), composite FK `(club_id, device_id)` to `devices(club_id, id)`, partial indexes for active sessions and devices |
| `auth_rate_limits` | `UNLOGGED` counters, primary key `(scope, subject, action, window_start)` |
| `auth_events` | Append-only audit trail, `GENERATED ALWAYS AS IDENTITY` id, partial indexes on identity and session |

Every table has RLS enabled and `REVOKE ALL … FROM anon, authenticated, PUBLIC` (the sequence too).
Nothing existing is altered, backfilled or dropped.

## `auth_events` retention delete

The trigger `auth_events_append_only` refuses every UPDATE and every DELETE, except a DELETE in a
transaction that set `rotra.auth_events_retention` to `on`. The housekeeping loop must run its delete
in an explicit transaction:

```sql
BEGIN;
SET LOCAL rotra.auth_events_retention = 'on';   -- or: SELECT set_config('rotra.auth_events_retention', 'on', true)
DELETE FROM auth_events WHERE id IN (
  SELECT id FROM auth_events WHERE occurred_at < now() - make_interval(days => $1) ORDER BY id LIMIT $2);
COMMIT;
```

The flag is transaction-local, so it never leaks to the next statement. Delete `auth_sessions` only
after the events that reference them (RESTRICT keeps that order honest).

## Not in Prisma, so in this SQL only

`UNLOGGED`, `fillfactor`, the identity column, all CHECKs, partial indexes and the trigger. `prisma
migrate diff` from the migrated database to the schema reports no difference. The Prisma models are in
`prisma/schema/admin/auth-sign-in.prisma`; they exist for drift checks and are not used by services.

Checks: `packages/db/tests/sign-in-tables.check.sql` (run on a disposable local database).
