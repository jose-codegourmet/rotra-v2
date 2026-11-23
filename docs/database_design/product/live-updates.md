# Live-update events

**Last verified:** 2026-11-15 · **Decisions:** [B-25, B-26, B-34, B-48, B-49, B-50](../../backend/open-decisions.md#settled)

**Status:** Design approved by the owner November 15, 2026 (B-50). **Built November 23, 2026 on the live-updates track, not applied
anywhere shared:** the migration `20261123000400_live_update_events` and the Prisma model exist and were applied to throwaway test
databases only. Its SQL **still needs owner sign-off** (B-36). Under [B-36](../../backend/open-decisions.md#settled), Prisma in
`packages/db` owns the schema until ship: a migration PR on `main` with owner sign-off, applied to Railway staging, then Supabase
production, **before** the API build that adds events is deployed (every Go write adds its event in its own transaction, so a database
without the table fails those writes). Follows [conventions](conventions.md) and the PostgreSQL table-design rules, with the exceptions
listed below. The migration also enables row level security, revokes the table from `anon`, `authenticated` and `PUBLIC`, and grants the
Go API's role (`rotra_api`, as in `20261119000200`) `SELECT, INSERT, DELETE`.

## What it is for

Every write that changes what a screen shows adds one small "this changed" row **in the same
transaction** (B-26, transactional outbox). The Go API's publisher reads new rows and pushes them to
the open streams (live-updates R1). It is **not** event sourcing: the normal tables stay the source of
truth, and these rows hold no names, scores or results. The rows are deleted after 7 days (B-34).

## Tables

### `live_update_events`

```sql
CREATE TABLE live_update_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  xact_id     xid8 NOT NULL DEFAULT pg_current_xact_id(),
  club_id     uuid NOT NULL,
  session_id  uuid,                        -- null for club-wide changes
  player_ids  uuid[] NOT NULL DEFAULT '{}', -- registered players whose own results changed
  kind        text NOT NULL CHECK (kind <> ''),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_update_events_cursor ON live_update_events (xact_id, id);
```

| Column | Why |
|---|---|
| `id` | One global number (B-49). It is the **snapshot version** a live message carries (B-25). Gaps are normal |
| `xact_id` | The writing transaction's id. The publisher reads in transaction order (B-48). Filled in by the database default, so neither Go nor the beta's Route Handlers (B-26) set it |
| `club_id` | Whose change it is. Picks the club topic, and is the authorization filter for live-updates R2 |
| `session_id` | The Queue Session it belongs to, if any. Picks the session topic |
| `player_ids` | The registered players (`players.id`, never a club player id) whose own results changed: a match finished or made invalid, a session finalized. Picks each player's own topic, so the profile's My sessions and Recent games update live (B-08, B-26). Empty for most writes. No index: the publisher matches it in memory |
| `kind` | What changed (courts, queue, roster…), so a screen can refresh only the matching query keys (live-updates R3). Plain text: Go owns the list, and a new kind needs no migration (B-45) |
| `created_at` | For the 7-day cleanup (B-34) and for Grafana |

### `queue_sessions.latest_event_id` (new column)

```sql
ALTER TABLE queue_sessions ADD COLUMN latest_event_id bigint;   -- null until the first event
```

The session's snapshot version (B-25). A write locks the session row, inserts its event, then stores
the new `id` here in the same transaction (B-49). Deleting old events never changes it (B-34). There is
no foreign key to `live_update_events`, because those rows are deleted.

## How it is used

**A write** (sketch, inside the write's own transaction):

```sql
SELECT revision FROM queue_sessions WHERE id = $session FOR UPDATE;   -- the revision check already does this
-- … the write itself …
INSERT INTO live_update_events (club_id, session_id, player_ids, kind)
VALUES ($club, $session, $players, $kind) RETURNING id;
UPDATE queue_sessions SET latest_event_id = $id WHERE id = $session;
```

**The publisher** (B-48), on each `NOTIFY` nudge, on start and after a reconnect:

```sql
SELECT xact_id, id, club_id, session_id, player_ids, kind
FROM live_update_events
WHERE (xact_id, id) > ($cursor_xact, $cursor_id)
  AND xact_id < pg_snapshot_xmin(pg_current_snapshot())
ORDER BY xact_id, id
LIMIT 1000;
```

The cursor becomes the `(xact_id, id)` of the last row read. The same position goes to phones as the
SSE event id, `"<xact_id>:<id>"`. A reconnect with `Last-Event-ID` runs the same query from that
position and sends one "changed, now at #M" per topic that moved, where M is the highest `id` for that
topic. A position older than the oldest row kept means "changed" for every topic (B-34).

**Cleanup** (B-34, hourly, under the advisory lock):

```sql
DELETE FROM live_update_events
WHERE id IN (
  SELECT id FROM live_update_events
  WHERE created_at < now() - interval '7 days'
  ORDER BY id
  LIMIT 1000
);
```

Rows arrive in roughly time order, so the oldest rows sit at the start of the primary key. This finds
them without a `created_at` index. A BRIN index on `created_at` is the fallback if the cleanup is ever
slow.

## Indexes

Only two: the primary key, and `(xact_id, id)` for the publisher and reconnects. No index per topic.
Reconnects after a deploy (B-44) start from a position seconds old, so they read very few rows. Only a
phone back after a long time reads more, and that is rare. Every extra index slows every write. Add one
only if the B-42 load test shows the need.

## Size

Worst case: 50 clubs writing about every 3 seconds for 4 hours is about 240,000 rows a night. Kept for
7 days, that is under a million rows. At around 100 bytes a row plus the two indexes, that is about
100–150 MB, well inside the 5 GB Hobby volume (B-14). No partitioning.

## Prisma

In its own group, `packages/db/prisma/schema/live-updates/live-update-event.prisma` (B-50). `latest_event_id`
goes on the `QueueSession` model in `queue/session.prisma`.

```prisma
model LiveUpdateEvent {
  id        BigInt                @id @default(autoincrement())
  xactId    Unsupported("xid8")   @default(dbgenerated("pg_current_xact_id()")) @map("xact_id")
  clubId    String                @map("club_id") @db.Uuid
  sessionId String?               @map("session_id") @db.Uuid
  playerIds String[]              @default([]) @map("player_ids") @db.Uuid
  kind      String
  createdAt DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("live_update_events")
}
```

Checked on a throwaway PostgreSQL 16 (November 23, 2026):

- `prisma.liveUpdateEvent.create()` works on the `Unsupported("xid8")` field with its database default: the row gets the writer's
  transaction id. The beta's Route Handlers append through raw SQL (`packages/db/src/live/append-event.ts`), which also locks the
  session row and stores `latest_event_id`.
- `GENERATED ALWAYS AS IDENTITY` and the `(xact_id, id)` index are in the migration SQL. The Prisma model declares the index
  (`@@index([xactId, id], map: "live_update_events_cursor")`), and `prisma migrate diff` from the migrated database to the schema is
  empty: nothing would drop the index or the identity.
- Still to confirm: `xid8` and `pg_current_xact_id()` need Postgres 13 or later, so check the version on Railway and on Supabase
  production before applying.

## Exceptions to the conventions

| Convention | Here | Why |
|---|---|---|
| Internal ids are UUIDs | `bigint` identity | The id is an ordered sequence, which the "sync sequence: positive `bigint`, sent as a decimal string" rule allows |
| Composite FKs on tenant keys | No foreign keys (owner, B-50) | Rows are short-lived notes, not records. Foreign keys would slow every write and get in the way of deleting sessions |
| `created_at`, `updated_at`, `revision` on mutable records | `created_at` only | Rows are never updated |
| Enums for fixed value sets | `kind` is text | The list grows with write routes (B-45) |

## Operations

- **A write left open delays every ping** (B-48). A transaction "idle in transaction", or a very long
  write, holds back `pg_snapshot_xmin`. Set `idle_in_transaction_session_timeout` (a few seconds) on
  the API's database role, and add a publisher-lag panel (the newest event's age minus the cursor's age)
  to the Grafana dashboard (B-16). Read-only work such as backups does not hold it back.
- `NOTIFY` is sent in the same transaction and arrives after commit. The listener uses its own direct
  connection (B-26).

## Owner answers (B-50, November 15, 2026)

1. **No foreign keys** from `live_update_events` to clubs, sessions or players.
2. **Player topic: one row per write, with a `player_ids` array** of the registered players whose own
   results changed. Rejected: no player column (profile pages would only refresh by hand, dropping
   B-26's player topic), and one extra row per player (more rows for no gain).
3. **Own Prisma group:** `packages/db/prisma/schema/live-updates/`, since Queue, Admin and Player
   writes all add events.
4. **Design approved,** including `queue_sessions.latest_event_id`. The migration PR (B-36) still needs
   owner sign-off on its SQL.
