import { expect, test } from '@playwright/test'
import { readAccounts } from '../../src/accounts.ts'
import { resetClock } from '../../src/clock.ts'
import { appUrl } from '../../src/stack.ts'
import {
  abandonCreatedSessions,
  addSavedPlayers,
  createSession,
  gamesPlayed,
  generateAndAddAll,
  matchDoneOn,
  seedVenue,
  sessionDone,
  sessionTimes,
  setPresent,
  startMatchOn,
  startSession,
  turnOnAutoQueue,
} from '../../src/ui/queue.ts'
import { rolePage, signInAdmin, signInPlayer, signInQueueMaster } from '../../src/ui/sign-in.ts'
import { advance, jumpTo, MINUTE } from '../../src/ui/time.ts'

test.use({ actionTimeout: 15_000 })
test.afterEach(async () => {
  await resetClock()
  await abandonCreatedSessions()
})

const COURTS = ['Court 1', 'Court 2']
const GAME = 15 * MINUTE

/**
 * UI-01 (REG-01 in the browser, smaller): one club night across Admin, Queue and Player
 * Information, each role in its own browser context, on virtual time.
 */
test('UI-01 a club night from Admin to Session done to the Player history', async ({ browser }) => {
  test.setTimeout(480_000)
  const accounts = readAccounts()
  const players = accounts.players.slice(0, 8)
  const names = players.map((player) => player.fullName)

  // Admin sees the e2e test club.
  const admin = await rolePage(browser)
  await signInAdmin(admin)
  await admin.goto(`${appUrl('admin')}/clubs`)
  await expect(
    admin.getByRole('table', { name: 'Clubs' }).getByRole('link', { name: accounts.club.name }),
  ).toBeVisible()

  // Queue Master: create the Queue Session (2 courts, doubles, 1 h) and fill the roster.
  const venue = 'UI-01 Hall'
  await seedVenue(venue)
  const qm = await rolePage(browser)
  await signInQueueMaster(qm)
  const sessionId = await createSession(qm, 'UI-01 Club Night', venue, { startHour: 7, endHour: 8 })
  await addSavedPlayers(qm, names)
  await expect(qm.getByRole('tab', { name: 'Roster and levels 8/16' })).toBeVisible()

  // Two minutes before the planned start: start the session, everyone present, Auto Queue on.
  const { startMs, endMs } = await sessionTimes(sessionId)
  await jumpTo(startMs - 2 * MINUTE, [qm])
  await startSession(qm, sessionId)
  await setPresent(qm, names)
  await expect(qm.getByRole('tab', { name: /^Players 8\/8/ })).toBeVisible()
  await turnOnAutoQueue(qm)

  // The courts open at the planned start. Each round: Generate matches, add the drafts to the
  // Main Queue (Auto Queue puts them on court), Start match, then Match done 15 minutes later.
  let now = await advance(3 * MINUTE, [qm])
  let rounds = 0
  while (now + GAME <= endMs + MINUTE) {
    expect(await generateAndAddAll(qm, 2)).toBe(COURTS.length)
    for (const label of COURTS) await startMatchOn(qm, label)
    now = await advance(GAME, [qm])
    for (const label of COURTS) await matchDoneOn(qm, label, 'A')
    rounds += 1
  }
  expect(rounds).toBeGreaterThanOrEqual(3)
  await expect(qm.getByText(`${rounds * COURTS.length} games recorded`)).toBeVisible()

  const firstName = names[0] as string
  const firstGames = await gamesPlayed(qm, firstName)
  expect(firstGames).toBeGreaterThan(0)

  // Past the planned end: Session done.
  await jumpTo(Math.max(now, endMs) + MINUTE, [qm])
  await qm.reload()
  await sessionDone(qm)
  await expect.poll(async () => (await sessionTimes(sessionId)).state).toBe('completed')

  // The registered Player sees the session and their games in Player Information.
  const player = await rolePage(browser)
  await signInPlayer(player, 1)
  await player.goto(`${appUrl('player')}/players/${players[0]?.playerId}`)
  const mySessions = player.locator('section', {
    has: player.getByRole('heading', { name: 'My sessions', exact: true }),
  })
  await expect(mySessions.getByText('UI-01 Club Night')).toBeVisible({ timeout: 30_000 })
  await expect(
    player.getByRole('button', { name: `All games (${firstGames})`, exact: true }),
  ).toBeVisible()
})
