import 'server-only'
import type { Tx } from './session-store'

// Finished sessions keep their hosts (epic #1002, #1008, D-2026-11-22-01). Kept apart from
// session-hosts.ts so Session done and Mark session invalid can freeze rows without importing the
// roster placement code.

/** The name a host row keeps (#1008): the ROTRA full name for a linked record, else the club's. */
export const hostName = (clubPlayer: {
  displayName: string
  player?: { fullName: string } | null
}) => clubPlayer.player?.fullName || clubPlayer.displayName

/** A finished session (#1008): its hosts are the rows frozen when it ended. */
export const ENDED_STATES = ['completed', 'invalid'] as const
export const endedState = (state: string) => (ENDED_STATES as readonly string[]).includes(state)

/**
 * Which host rows a read shows (#1008, D-2026-11-22-01): the current rows of an open session, or
 * the rows frozen when a finished session ended (never one removed before the end).
 */
export const shownHostRows = (state: string) =>
  endedState(state) ? { frozenAt: { not: null } } : { removedAt: null }

/**
 * Session done or Mark session invalid (#1008), inside that command's transaction, after the
 * session's state changed: the rows still current get the host's name once more and are frozen.
 * Rows removed earlier stay unfrozen history. Deleted or moved saved players keep the last name
 * their row had (their record is no longer the club's to rename).
 */
export async function freezeSessionHostsIn(tx: Tx, sessionId: string, now: Date) {
  const rows = await tx.sessionHost.findMany({
    where: { sessionId, removedAt: null, frozenAt: null },
    select: {
      id: true,
      nameSnapshot: true,
      clubPlayer: {
        select: { displayName: true, removedAt: true, player: { select: { fullName: true } } },
      },
    },
  })
  for (const row of rows)
    await tx.sessionHost.update({
      where: { id: row.id },
      data: {
        nameSnapshot: row.clubPlayer.removedAt ? row.nameSnapshot : hostName(row.clubPlayer),
        frozenAt: now,
        revision: { increment: 1 },
      },
    })
}
