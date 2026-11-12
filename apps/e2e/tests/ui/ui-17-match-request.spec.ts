import { expect, type Page, test } from '@playwright/test'
import { resetClock } from '../../src/clock.ts'
import { liveSession } from '../../src/ui/journeys.ts'
import { abandonCreatedSessions, consoleTab } from '../../src/ui/queue.ts'
import { rolePage, signInPlayer } from '../../src/ui/sign-in.ts'

test.use({ actionTimeout: 15_000 })
test.afterEach(async () => {
  await resetClock()
  await abandonCreatedSessions()
})

const myNight = (page: Page) => page.getByRole('region', { name: 'My night' })

/** The signed-in Player's Request a match: doubles, every spot Anyone, Send request. */
async function requestAMatch(player: Page) {
  await myNight(player).getByRole('button', { name: 'Request a match', exact: true }).click()
  const sheet = player.getByRole('dialog', { name: 'Request a match' })
  // The sheet's options (allowed formats, present players) load after it opens.
  await expect(
    sheet.getByRole('radiogroup', { name: 'Format' }).getByRole('radio', { checked: true }),
  ).toBeVisible()
  await sheet.getByRole('button', { name: /^Partner: Anyone/ }).waitFor()
  await sheet.getByRole('button', { name: 'Send request', exact: true }).click()
  await expect(sheet).toBeHidden({ timeout: 30_000 })
  await expect(myNight(player).getByText('Match request sent · the QM decides')).toBeVisible()
}

/** The live console's Match requests · N (the Requests sheet). */
async function openRequests(qm: Page, count: number) {
  await qm.reload()
  const button = qm.getByRole('button', { name: `Match requests · ${count} waiting`, exact: true })
  await expect(button).toBeVisible({ timeout: 30_000 })
  await button.click()
  return qm.getByRole('dialog', { name: 'Requests' })
}

/**
 * UI-17: a registered Player on the session page sends Request a match (doubles, Anyone); the
 * Queue Master adds it to the queue; a second request is Declined and the Player sees it closed.
 */
test('UI-17 Request a match: added to the queue, then a second one declined', async ({
  browser,
}) => {
  test.setTimeout(300_000)
  // DEFECT (app, real mode): on the session page My night shows Request a match (the sheet opens,
  // formats and present players load from the Player app), but Send request closes the sheet and
  // My night never shows "Match request sent · the QM decides"; the run's trace has no
  // POST /api/public-sessions/:slug/match-request reaching the Player app.
  test.fail()
  const player = await rolePage(browser)
  await signInPlayer(player, 1)
  // Everyone present, the requester included (the Queue Master marks presence; see UI-17 I'm here).
  const { qm, link, roster } = await liveSession(browser, {
    title: 'UI-17 Requests',
    rosterSize: 8,
    slot: { startHour: 1, endHour: 2 },
    others: [player],
  })
  const me = roster[0]
  if (!me) throw new Error('[e2e] No seeded player 1.')

  // The Player's own night on the Queue session page (the Player app's sign-in, real mode).
  await player.goto(link)
  await expect(myNight(player)).toBeVisible({ timeout: 30_000 })
  await expect(myNight(player).getByText('Not in a queued match')).toBeVisible()

  // First request: the Queue Master adds it to the queue.
  await requestAMatch(player)
  let requests = await openRequests(qm, 1)
  await expect(requests.getByText(/asks for a .* match/)).toBeVisible()
  await requests.getByRole('button', { name: 'Add to queue', exact: true }).click()
  await expect(qm.getByText('Match added to the queue')).toBeVisible({ timeout: 30_000 })
  await qm.keyboard.press('Escape')
  await expect(consoleTab(qm, 'Queue')).toHaveAccessibleName(/^Queue 1 waiting/)

  await player.reload()
  await expect(myNight(player).getByText(/^In queue #1 · /)).toBeVisible({ timeout: 30_000 })
  await expect(myNight(player).getByText('Match request sent · the QM decides')).toHaveCount(0)

  // Second request: Declined; the Player's request is closed.
  await requestAMatch(player)
  requests = await openRequests(qm, 1)
  await requests.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(qm.getByText(/'s match request declined$/)).toBeVisible({ timeout: 30_000 })

  await player.reload()
  await expect(myNight(player)).toBeVisible({ timeout: 30_000 })
  await expect(myNight(player).getByText('Match request sent · the QM decides')).toHaveCount(0)
  await expect(
    myNight(player).getByRole('button', { name: 'Request a match', exact: true }),
  ).toBeVisible()
})

// No real-mode path: I'm here (useSelfCheckIn -> playerMutations.selfCheckIn) is mock only. In
// real mode its mock `delay()` refuses with NotConnectedError, there is no Player-app route for it,
// and there is no self check-in mark in the database (packages/db/src/queue/match-requests.ts
// readSessionRequests: "self check-in is not real yet"). Building it needs a schema change, so it
// is out of scope for wiring; UI-17 above has the Queue Master mark the requester present instead.
test.fixme("UI-17 I'm here: the signed-in Player checks themselves in from My night", () => {})
