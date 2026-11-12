import { expect, test } from '@playwright/test'
import { resetClock } from '../../src/clock.ts'
import { liveSession } from '../../src/ui/journeys.ts'
import {
  abandonCreatedSessions,
  consoleTab,
  court,
  generateAndAddAll,
  playersOn,
  setPresent,
  turnOnAutoQueue,
} from '../../src/ui/queue.ts'
import { advance, MINUTE } from '../../src/ui/time.ts'

test.use({ actionTimeout: 15_000 })
// Clean up on the journey's own virtual time first (court actions follow the server clock).
test.afterEach(async () => {
  await abandonCreatedSessions()
  await resetClock()
})

/**
 * UI-12: a player is hurt while their match is On court (placed, not started). Start match is
 * disabled with the reason shown until the Queue Master replaces them.
 */
test('UI-12 injury On court: Start match waits for a replacement', async ({ browser }) => {
  test.setTimeout(300_000)
  // Nine present: a match on each court leaves one player free to come in.
  const { qm, roster } = await liveSession(browser, {
    title: 'UI-12 Injury',
    rosterSize: 9,
    slot: { startHour: 3, endHour: 4 },
  })
  await turnOnAutoQueue(qm)
  await advance(3 * MINUTE, [qm])
  await generateAndAddAll(qm, 2)

  await consoleTab(qm, 'Session').click()
  const card = court(qm, 'Court 1')
  await expect(card.getByText('Getting ready', { exact: true }).first()).toBeVisible()
  const start = card.getByRole('button', { name: 'Start match', exact: true })
  await expect(start).toBeEnabled()

  // Who is on the courts: the cards list each lineup by name (Team A, then Team B).
  const court1 = await playersOn(qm, 'Court 1')
  const onCourts = [...court1, ...(await playersOn(qm, 'Court 2'))]
  expect(onCourts).toHaveLength(8)
  const hurt = roster.find((player) => player.fullName === court1[0])
  const free = roster.find((player) => !onCourts.includes(player.fullName))
  if (!hurt || !free) throw new Error('[e2e] Court lineups not found on the cards.')

  // The injury: Present off. Start match is disabled and the reason is on the card.
  await setPresent(qm, [hurt.fullName], false)
  await consoleTab(qm, 'Session').click()
  await expect(start).toBeDisabled()
  const reason = await start.getAttribute('title')
  expect(reason ?? '').toContain(hurt.fullName.split(' ')[0] as string)
  await expect(card.getByText(reason as string, { exact: true })).toBeVisible()

  // Open match › Replace player › the hurt player (first in the lineup) out, the only free player
  // in. The tiles show short names (every seeded player reads "E2E"), so they go by position.
  await card.getByRole('button', { name: 'Open match', exact: true }).click()
  const sheet = qm.getByRole('dialog', { name: /^Match \d+ · Court 1 · Getting ready$/ })
  await expect(sheet.getByRole('button', { name: 'Start match', exact: true })).toBeDisabled()
  await sheet.getByRole('button', { name: 'Replace player', exact: true }).click()
  const replace = qm.getByRole('dialog', { name: /^Replace a player in match \d+$/ })
  await replace
    .getByRole('group', { name: "Who's coming out?" })
    .getByRole('button')
    .first()
    .click()
  const replacements = replace.getByRole('group', { name: 'Replacement' }).getByRole('button')
  await expect(replacements).toHaveCount(1)
  await replacements.first().click()
  await replace.getByRole('button', { name: 'Replace player', exact: true }).click()

  // Back on the On court sheet: Start match works again.
  const startInSheet = qm
    .getByRole('dialog', { name: /^Match \d+ · Court 1 · Getting ready$/ })
    .getByRole('button', { name: 'Start match', exact: true })
  await expect(startInSheet).toBeEnabled({ timeout: 30_000 })
  await startInSheet.click()
  await expect(card.getByText('Playing', { exact: true }).first()).toBeVisible({ timeout: 30_000 })
  expect(await playersOn(qm, 'Court 1')).toContain(free.fullName)
  expect(await playersOn(qm, 'Court 1')).not.toContain(hurt.fullName)
})
