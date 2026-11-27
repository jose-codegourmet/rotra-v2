import 'server-only'
import { formFromHistory } from '@rotra/data/match/win-chance'
import type { GameWinChanceFace } from '@rotra/data/player/game-win-chance'
import { sessionWeekday } from '@rotra/data/player/rules'
import type { Prisma } from '../generated/prisma/client'
import { levelCodeFor } from '../queue/session-store'

type Tx = Prisma.TransactionClient

/** The session a game was played in, as far as the win chance needs it. */
export type WinChanceSession = { id: string; scheduledStartAt: Date; finalizedAt: Date | null }

/**
 * Win chance inputs for finished games in ROTRA Player (D-2026-11-27-03): each club player's
 * lasting form at their club, read the way the Queue Master roster read does (`readSessionRosterIn`,
 * D-2026-11-27-02), so a finished match shows the same numbers in both apps. One query for every
 * club player a read involves, however many games it draws.
 *
 * The returned function gives one club player's form for a game of `session`: their wins and losses
 * in the club's sessions finalized before that session, by weekday, through `formFromHistory`
 * (leaderboard place and direction stay 0 until rank calculation is real). Undefined when they have
 * no finalized session there before it: the level alone is used.
 */
export async function readClubForms(
  tx: Tx,
  clubIds: readonly string[],
  clubPlayerIds: readonly string[],
) {
  const players = [...new Set(clubPlayerIds)]
  const rows = players.length
    ? await tx.clubSessionPlayerSummary.findMany({
        where: { clubId: { in: [...new Set(clubIds)] }, clubPlayerId: { in: players } },
        select: {
          clubPlayerId: true,
          sessionId: true,
          wins: true,
          losses: true,
          finalization: { select: { committedAt: true } },
        },
      })
    : []
  const sessions = rows.length
    ? await tx.queueSession.findMany({
        where: { id: { in: [...new Set(rows.map((row) => row.sessionId))] } },
        select: { id: true, scheduledStartAt: true },
      })
    : []
  const weekdayOf = new Map(sessions.map((s) => [s.id, sessionWeekday(s.scheduledStartAt)]))
  const history = new Map<string, typeof rows>()
  for (const row of rows)
    history.set(row.clubPlayerId, [...(history.get(row.clubPlayerId) ?? []), row])
  const cache = new Map<string, GameWinChanceFace['form']>()
  return (clubPlayerId: string | undefined, session: WinChanceSession) => {
    if (!clubPlayerId) return undefined
    const key = `${clubPlayerId}:${session.id}`
    if (cache.has(key)) return cache.get(key)
    const before = session.finalizedAt ?? new Date()
    const prior = (history.get(clubPlayerId) ?? []).filter(
      (row) =>
        row.sessionId !== session.id &&
        !!row.finalization.committedAt &&
        row.finalization.committedAt < before,
    )
    const form = prior.length
      ? formFromHistory(
          prior.map((row) => ({
            weekday: weekdayOf.get(row.sessionId) ?? -1,
            wins: row.wins,
            losses: row.losses,
          })),
          sessionWeekday(session.scheduledStartAt),
        )
      : undefined
    cache.set(key, form)
    return form
  }
}

/** A face's win chance inputs: the level it played that session at, and its form when it has one. */
export function winChanceFace(
  skillLevelSnapshotId: number | null | undefined,
  form: GameWinChanceFace['form'],
): GameWinChanceFace {
  return { level: levelCodeFor(skillLevelSnapshotId ?? null), ...(form ? { form } : {}) }
}
