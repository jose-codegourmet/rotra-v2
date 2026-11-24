import 'server-only'
import type { Prisma } from '../generated/prisma/client'

/**
 * Live updates for the writes that have not moved to the Go API yet (B-26, live-updates R1): adds the
 * same `live_update_events` row the Go helper adds, inside the write's own transaction, so the Go
 * publisher pushes it and the open screens refresh. The row holds no names, scores or results.
 *
 * Same steps as `apps/api/internal/liveupdates` (docs/database_design/product/live-updates.md):
 * lock the session row, insert the event (the database fills `xact_id`), store the new id as the
 * session's `latest_event_id` (its snapshot version, B-25, B-49), and NOTIFY (delivered after commit).
 * Raw SQL on purpose: Prisma has no xid8 type, and the insert must leave `xact_id` to the database
 * default (B-48).
 */
export type LiveUpdateEvent = {
  clubId: string
  /** Null or omitted for a club-wide change. */
  sessionId?: string | null
  /** Registered players (`players.id`) whose own results changed: a match finished or made invalid, a session finalized. */
  playerIds?: readonly string[]
  /** What changed (`session`, `queue`, `roster`...). Go owns the list; plain text (B-45). */
  kind: string
}

/** Channel the Go publisher listens on. */
export const LIVE_UPDATES_CHANNEL = 'live_updates'

/** Appends one event in `tx` and returns its id (the session's new snapshot version). */
export async function appendLiveUpdateEvent(
  tx: Prisma.TransactionClient,
  event: LiveUpdateEvent,
): Promise<bigint> {
  const sessionId = event.sessionId ?? null
  const playerIds = event.playerIds ? [...event.playerIds] : []
  if (sessionId) {
    // Ids of one session then follow commit order (B-49): the lock is held until commit.
    await tx.$queryRaw`SELECT "id" FROM "queue_sessions" WHERE "id" = ${sessionId}::uuid FOR UPDATE`
  }
  const rows = await tx.$queryRaw<{ id: bigint }[]>`
    INSERT INTO "live_update_events" ("club_id", "session_id", "player_ids", "kind")
    VALUES (${event.clubId}::uuid, ${sessionId}::uuid, ${playerIds}::uuid[], ${event.kind})
    RETURNING "id"`
  const id = rows[0]?.id
  if (id === undefined) throw new Error('live_update_events insert returned no id')
  if (sessionId) {
    await tx.$executeRaw`UPDATE "queue_sessions" SET "latest_event_id" = ${id} WHERE "id" = ${sessionId}::uuid`
  }
  await tx.$executeRaw`SELECT pg_notify(${LIVE_UPDATES_CHANNEL}, '')`
  return id
}

/**
 * The registered players (`players.id`, never a club player id) who played a match, found through the saved
 * player's link the way the Player's own-night read finds their roster entry. They go in `playerIds` of the
 * event of the match's end (B-50).
 */
export async function registeredPlayersOfMatch(
  tx: Prisma.TransactionClient,
  matchId: string,
): Promise<string[]> {
  const rows = await tx.$queryRaw<{ player_id: string }[]>`
    SELECT DISTINCT cp."player_id"::text AS player_id
    FROM "match_participations" mp
    JOIN "session_players" sp ON sp."id" = mp."session_player_id"
    JOIN "club_players" cp ON cp."club_id" = sp."club_id" AND cp."id" = sp."club_player_id"
    WHERE mp."match_id" = ${matchId}::uuid AND cp."player_id" IS NOT NULL`
  return rows.map((r) => r.player_id)
}
