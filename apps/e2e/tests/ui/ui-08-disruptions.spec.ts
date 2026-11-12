import { expect, test } from '@playwright/test'
import { resetClock } from '../../src/clock.ts'
import { knownDefect } from '../../src/known-defect.ts'
import { liveSession } from '../../src/ui/journeys.ts'
import {
  abandonCreatedSessions,
  consoleTab,
  court,
  gamesPlayed,
  generateAndAddAll,
  matchDoneOn,
  minimumGames,
  playersOn,
  sessionDone,
  sessionTimes,
  setPresent,
  startMatchOn,
  substituteNobody,
  turnOnAutoQueue,
} from '../../src/ui/queue.ts'
import { advance, jumpTo, MINUTE } from '../../src/ui/time.ts'

test.use({ actionTimeout: 15_000 })
// Clean up on the journey's own virtual time first (court actions follow the server clock).
test.afterEach(async () => {
  await abandonCreatedSessions()
  await resetClock()
})

const COURTS = ['Court 1', 'Court 2']

/** REG-DEF-01 in the browser: Session done with a planned match that never started returns 500. */
const SESSION_DONE_500 = {
  id: 'UI-08',
  bug: 'Session done returns 500 with a match that never started (REG-DEF-01)',
  match: /^Session done: POST …\/finalization -> 500$/,
}
const GAME = 12 * MINUTE

/**
 * UI-08 (disruptions in the browser): the UI-01 night with one late player (present 20 virtual
 * minutes in), one injury (substituted during a Playing match with Who gets this game? = Nobody,
 * then Present off) and one player eating (Present off, then on again). Session done's review
 * lists exactly the players below the minimum.
 */
test('UI-08 late player, injury and a meal break; Session done lists the shortfalls [known bug: Session done 500]', async ({
  browser,
}) => {
  test.setTimeout(480_000)
  const live = await liveSession(browser, {
    title: 'UI-08 Disruptions',
    rosterSize: 9,
    present: 8,
    slot: { startHour: 5, endHour: 6 },
  })
  const { qm, startMs, endMs, roster } = live
  const names = roster.map((player) => player.fullName)
  const late = names[8] as string
  await turnOnAutoQueue(qm)

  // Generate `pick` matches, add them; Auto Queue puts what it can on free courts; start `count`.
  // Drafts are planned games, so with too few free players some stay waiting for a later round.
  const round = async (pick: 2, count: number = pick) => {
    expect(await generateAndAddAll(qm, pick)).toBeGreaterThanOrEqual(count)
    await consoleTab(qm, 'Session').click()
    const started: string[] = []
    for (const label of COURTS) {
      const start = court(qm, label).getByRole('button', { name: 'Start match', exact: true })
      if (await start.isVisible()) {
        await startMatchOn(qm, label)
        started.push(label)
      }
    }
    expect(started).toHaveLength(count)
    return started
  }
  const finish = async (courts: string[]) => {
    for (const label of courts) await matchDoneOn(qm, label, 'A')
  }

  // Round 1 at the planned start, eight present.
  await jumpTo(startMs + MINUTE, [qm])
  const first = await round(2)
  await advance(GAME, [qm])
  await finish(first)

  // The late player arrives 20 virtual minutes in.
  await jumpTo(startMs + 20 * MINUTE, [qm])
  await setPresent(qm, [late])

  // Round 2: nine present, eight on court, one free. An injury five minutes into play: the free
  // player comes in, nobody gets the game, and the injured player goes Present off.
  await round(2)
  const onCourts = [...(await playersOn(qm, 'Court 1')), ...(await playersOn(qm, 'Court 2'))]
  expect(onCourts).toHaveLength(8)
  const free = names.find((name) => !onCourts.includes(name)) as string
  const injured = (await playersOn(qm, 'Court 1'))[0] as string
  await advance(5 * MINUTE, [qm])
  await substituteNobody(qm, 'Court 1', 0)
  expect(await playersOn(qm, 'Court 1')).toContain(free)
  expect(await playersOn(qm, 'Court 1')).not.toContain(injured)
  await setPresent(qm, [injured], false)
  await advance(GAME - 5 * MINUTE, [qm])
  await finish(COURTS)

  // Round 3: someone goes to eat (Present off); seven present makes one doubles match.
  const eating = names.find((name) => name !== injured && name !== late) as string
  await setPresent(qm, [eating], false)
  await advance(MINUTE, [qm])
  const third = await round(2, 1)
  expect(await playersOn(qm, third[0] as string)).not.toContain(eating)
  await advance(GAME, [qm])
  await finish(third)

  // Back from eating; round 4 with eight present.
  await setPresent(qm, [eating], true)
  await advance(MINUTE, [qm])
  await round(2)
  const now = await advance(GAME, [qm])
  await finish(COURTS)
  await expect(qm.getByText('7 games recorded')).toBeVisible()

  // Who is below the minimum, from each player's games played.
  const minimum = await minimumGames(qm)
  expect(minimum).toBeGreaterThan(0)
  const expected: string[] = []
  for (const name of names) {
    const games = await gamesPlayed(qm, name)
    if (games < minimum) expected.push(`${name} ${games} of ${minimum}`)
  }
  expect(expected.some((line) => line.startsWith(`${injured} `))).toBe(true)

  await jumpTo(Math.max(now, endMs) + MINUTE, [qm])
  await qm.reload()
  // Round 3 planned a second match that never started; Session done must drop it.
  await knownDefect(SESSION_DONE_500, async () => {
    const finalization = qm.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.endsWith('/finalization'),
    )
    const listed = await sessionDone(qm)
    expect(listed.map((line) => line.replace(/\s+/g, ' ')).sort()).toEqual(expected.sort())
    const response = await finalization
    if (response.status() >= 500)
      throw new Error(`Session done: POST …/finalization -> ${response.status()}`)
  })
  await expect.poll(async () => (await sessionTimes(live.sessionId)).state).toBe('completed')
})
