import type { Browser, Page } from '@playwright/test'
import { readAccounts } from '../accounts.ts'
import {
  addSavedPlayers,
  createSession,
  moveToFreeDay,
  seedVenue,
  sessionLink,
  sessionTimes,
  setPresent,
  startSession,
} from './queue.ts'
import { rolePage, signInQueueMaster } from './sign-in.ts'
import { jumpTo, MINUTE } from './time.ts'

export type LiveSession = {
  qm: Page
  sessionId: string
  link: string
  startMs: number
  endMs: number
  /** Seeded players on the roster, in order (fullName, playerId, n) */
  roster: ReturnType<typeof readAccounts>['players']
}

/**
 * A Queue Master in their own browser context with a started Queue Session: created through the
 * session form (2 courts, doubles, tomorrow in `slot`; days later when an earlier run took that
 * slot), `rosterSize` saved players added, the clocks
 * moved to two minutes before the planned start, started, and `present` of them marked present.
 * `others` are role pages whose browser clocks move along.
 */
export async function liveSession(
  browser: Browser,
  options: {
    title: string
    rosterSize: number
    slot: { startHour: number; endHour: number }
    present?: number
    others?: Page[]
  },
): Promise<LiveSession> {
  const roster = readAccounts().players.slice(0, options.rosterSize)
  const venue = `${options.title} Hall`
  await seedVenue(venue)
  const qm = await rolePage(browser)
  await signInQueueMaster(qm)
  await moveToFreeDay(options.slot, [qm, ...(options.others ?? [])])
  const sessionId = await createSession(qm, options.title, venue, options.slot)
  await addSavedPlayers(
    qm,
    roster.map((player) => player.fullName),
  )
  const link = await sessionLink(qm, sessionId)
  const { startMs, endMs } = await sessionTimes(sessionId)
  await jumpTo(startMs - 2 * MINUTE, [qm, ...(options.others ?? [])])
  await startSession(qm, sessionId)
  const present = roster.slice(0, options.present ?? roster.length)
  if (present.length)
    await setPresent(
      qm,
      present.map((player) => player.fullName),
    )
  return { qm, sessionId, link, startMs, endMs, roster }
}
