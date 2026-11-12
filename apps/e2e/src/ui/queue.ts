import { randomUUID } from 'node:crypto'
import { expect, type Page, type Response } from '@playwright/test'
import { busyWindows, ensureVenue, overlaps } from '../api/schedule.ts'
import { asQueueMaster } from '../api/sign-in.ts'
import { appUrl } from '../stack.ts'
import { jumpTo, MINUTE } from './time.ts'

const exact = { exact: true } as const

/** A venue for the session form's picker (venues are not under test here); reused on re-runs. */
export async function seedVenue(name: string) {
  const api = await asQueueMaster()
  await ensureVenue(api, name)
  await api.dispose()
}

const DAY = 24 * 60 * MINUTE
const MANILA = 8 * 60 * MINUTE

/** The session form's default date (tomorrow, Asia/Manila) at START:00 to END:00 PM, seen at `nowMs`. */
function tomorrowSlot(nowMs: number, slot: { startHour: number; endHour: number }) {
  const local = new Date(nowMs + MANILA)
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1)
  return {
    startMs: day + (12 + slot.startHour) * 60 * MINUTE - MANILA,
    endMs: day + (12 + slot.endHour) * 60 * MINUTE - MANILA,
  }
}

/**
 * Re-runs never reseed the database, and a finished session keeps its time (it still clashes).
 * Before Create session: moves the server clocks and `pages`' browser clocks whole days ahead
 * until the form's tomorrow at `slot` clashes with no earlier session. No move when it is free.
 */
export async function moveToFreeDay(slot: { startHour: number; endHour: number }, pages: Page[]) {
  const api = await asQueueMaster()
  const busy = await busyWindows(api)
  await api.dispose()
  const now = Date.now()
  for (let days = 0; days < 366; days++) {
    const at = now + days * DAY
    if (overlaps(busy, tomorrowSlot(at, slot))) continue
    if (days) await jumpTo(at, pages)
    return
  }
  throw new Error('[e2e] No free day for the session in the next year.')
}

/** Picks HOUR:00 PM in the session form's Starts or Ends time dialog. */
async function pickTime(page: Page, field: 'Starts' | 'Ends', hour: number) {
  await page.getByRole('button', { name: new RegExp(`^${field}: `) }).click()
  const dialog = page.getByRole('dialog', { name: field })
  await dialog.getByRole('radio', { name: 'PM', ...exact }).check()
  await dialog.getByRole('button', { name: String(hour), ...exact }).click()
  await dialog.getByRole('button', { name: ':00', ...exact }).click()
  await dialog.getByRole('button', { name: 'Done', ...exact }).click()
  await expect(
    page.getByRole('button', { name: `${field}: ${hour}:00 PM. Change time` }),
  ).toBeVisible()
}

/**
 * Q-SESSION-SETUP: Create session with the form's defaults (tomorrow, 2 courts, doubles, Fair)
 * from START:00 to END:00 PM. Every session of the club clashes with any other at the same time,
 * so each journey takes its own slot. Returns the new session's id from the Preparation URL.
 */
export async function createSession(
  page: Page,
  title: string,
  venue: string,
  slot: { startHour: number; endHour: number },
) {
  await page.goto(`${appUrl('queue')}/sessions/new`)
  await page.getByLabel('Session title').fill(title)
  await page.getByRole('button', { name: /^Venue: none chosen/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${venue}\\b`) }).click()
  await pickTime(page, 'Starts', slot.startHour)
  await pickTime(page, 'Ends', slot.endHour)
  await page.getByRole('button', { name: 'Next', ...exact }).click()
  await expect(page.getByRole('switch', { name: 'Doubles' })).toBeChecked()
  await page.getByRole('button', { name: 'Next', ...exact }).click()
  await page.getByRole('button', { name: 'Create session', ...exact }).click()
  await page.waitForURL(/\/sessions\/[^/]+\/preparation/, { timeout: 30_000 })
  const id = /\/sessions\/([^/]+)\/preparation/.exec(page.url())?.[1]
  if (!id) throw new Error(`[e2e] No session id in ${page.url()}`)
  created.push(id)
  return id
}

/** Sessions this worker created, for `abandonCreatedSessions` after each journey. */
const created: string[] = []

/** Preparation › Roster and levels › Add player › Saved players, each at `level`. */
export async function addSavedPlayers(page: Page, names: string[], level = 'Intermediate Mid') {
  await page.getByRole('tab', { name: /^Roster and levels/ }).click()
  await page.getByRole('button', { name: 'Add player', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Add player' })
  for (const name of names) {
    const pick = sheet.getByRole('button', { name: new RegExp(`^${name} `) })
    await pick.click()
    // Only a player with no level yet opens the level step; one the club has placed before is
    // added straight away at that level.
    const levelStep = sheet.getByRole('combobox', { name: /^Level for this club/ })
    const search = sheet.getByRole('searchbox', { name: 'Search saved players' })
    // Either the level step replaces the list, or the list comes back without the player.
    await expect
      .poll(
        async () =>
          (await levelStep.isVisible()) ||
          ((await search.isVisible()) && (await pick.count()) === 0),
      )
      .toBe(true)
    if (await levelStep.isVisible()) {
      await levelStep.click()
      await page.getByRole('option', { name: level, ...exact }).click()
      await sheet.getByRole('button', { name: 'Confirm player slot', ...exact }).click()
      await expect(search).toBeVisible()
    }
    await expect(pick).toHaveCount(0)
  }
  await sheet.getByRole('button', { name: 'Done', ...exact }).click()
  await expect(sheet).toBeHidden()
  // Roster adds save in one batch about 800 ms after the last tap. Leaving the page before then
  // (Start session navigates) drops them, so let the batch go out first, as setPresent does.
  await page.waitForTimeout(2_500)
}

export type SessionTimes = { startMs: number; endMs: number; state: string }

/** The session's planned window from the Queue Master's own read (GET /api/sessions/:id). */
export async function sessionTimes(sessionId: string): Promise<SessionTimes> {
  const api = await asQueueMaster()
  const { session } = await api.get<{
    session: { scheduledStartAt: string; scheduledEndAt: string; state: string }
  }>(`/api/sessions/${sessionId}`)
  await api.dispose()
  return {
    startMs: Date.parse(session.scheduledStartAt),
    endMs: Date.parse(session.scheduledEndAt),
    state: session.state,
  }
}

/** Preparation › Start session › the dialog's Start session; lands on the live console. */
export async function startSession(page: Page, sessionId: string) {
  await page.goto(`${appUrl('queue')}/sessions/${sessionId}/preparation`)
  await page.getByRole('button', { name: 'Start session', ...exact }).click()
  await page
    .getByRole('dialog', { name: 'Start session?' })
    .getByRole('button', { name: 'Start session', ...exact })
    .click()
  await page.waitForURL(new RegExp(`/sessions/${sessionId}$`), { timeout: 30_000 })
  // The console's own label (the app nav can also show a Live session link).
  await expect(page.getByRole('main').getByText('Live session', exact)).toBeVisible()
}

export const consoleTab = (page: Page, name: 'Session' | 'Queue' | 'Players' | 'Leaderboard') =>
  page
    .getByRole('tablist', { name: 'Console views' })
    .getByRole('tab', { name: new RegExp(`^${name}`) })

/**
 * Players › Everyone › the `NAME present` switch, set to `present`. The switches save in a shared
 * presence batch (about 800 ms later), so this reloads and checks the saved state before the next
 * step reads presence on the server (Generate matches does).
 */
export async function setPresent(page: Page, names: string[], present = true) {
  const toggles = async () => {
    await consoleTab(page, 'Players').click()
    await page.getByRole('radio', { name: /^Everyone/ }).click()
    return (name: string) => page.getByRole('switch', { name: `${name} present`, ...exact })
  }
  let toggle = await toggles()
  for (const name of names)
    if ((await toggle(name).isChecked()) !== present) await toggle(name).click()
  // Let the presence batch go out (it waits about 800 ms), then read the saved state back.
  await page.waitForTimeout(2_500)
  await page.reload()
  toggle = await toggles()
  for (const name of names)
    if (present) await expect(toggle(name)).toBeChecked()
    else await expect(toggle(name)).not.toBeChecked()
}

/** Session › Court filling › Auto Queue. */
export async function turnOnAutoQueue(page: Page) {
  await consoleTab(page, 'Session').click()
  const auto = page.getByRole('radio', { name: 'Auto Queue', ...exact })
  await auto.click()
  await expect(auto).toBeChecked()
}

/**
 * Queue › Generate matches › Available Players › How many matches? COUNT (2, 3, 4 or 6) ›
 * Generate › Add all › Add to Main Queue. Returns how many drafts were added (fewer when not
 * enough players are free).
 */
export async function generateAndAddAll(page: Page, count: 2 | 3 | 4 | 6) {
  await consoleTab(page, 'Queue').click()
  await page.getByRole('radio', { name: 'Generate matches', ...exact }).click()
  await page
    .getByRole('group', { name: 'How many matches?' })
    .getByRole('button', { name: String(count), ...exact })
    .click()
  await page.getByRole('button', { name: /^Generate (\d+ )?matches$/ }).click()
  const addAll = page.getByRole('button', { name: /^Add all \d+$/ })
  await expect(addAll).toBeVisible({ timeout: 30_000 })
  const added = Number((await addAll.textContent())?.replace(/\D+/g, ''))
  await addAll.click()
  const review = page.getByRole('dialog', { name: 'Add selected to Main Queue?' })
  // Keep what the add sends, so a failure says what the server answered (known defects match it).
  const refused: string[] = []
  const saved: string[] = []
  const onResponse = async (response: Response) => {
    const request = response.request()
    if (request.method() !== 'POST' || !/\/api\/sessions\/[^/]+\/matches$/.test(response.url()))
      return
    const line = `POST ${new URL(response.url()).pathname} -> ${response.status()}`
    if (response.status() < 400) saved.push(line)
    else refused.push(`${line} ${await response.text().catch(() => '')}`)
  }
  page.on('response', onResponse)
  try {
    await review.getByRole('button', { name: 'Add to Main Queue', ...exact }).click()
    await expect(review).toBeHidden({ timeout: 30_000 })
  } catch (error) {
    const sheet = (await review.innerText().catch(() => '')).replace(/\s+/g, ' ')
    if (refused.length)
      throw new Error(`Add to Main Queue refused: ${refused.join('; ')}; the sheet says: ${sheet}`)
    if (saved.length && sheet.includes('Adding reviewed drafts'))
      throw new Error(
        `Add to Main Queue: ${saved.join('; ')} but the sheet stays on "Adding reviewed drafts… Please wait." (${sheet})`,
      )
    throw error
  } finally {
    page.off('response', onResponse)
  }
  return added
}

export const court = (page: Page, label: string) =>
  page.getByRole('article', { name: label, ...exact })

/** Session › COURT › Start match (the match Auto Queue put on court). */
export async function startMatchOn(page: Page, label: string) {
  await consoleTab(page, 'Session').click()
  const card = court(page, label)
  await card.getByRole('button', { name: 'Start match', ...exact }).click()
  await expect(card.getByText('Playing', exact)).toBeVisible({ timeout: 30_000 })
}

/** Session › COURT › Open match › Match done › Pick the winner › Review result › Confirm. */
export async function matchDoneOn(page: Page, label: string, winner: 'A' | 'B' = 'A') {
  await consoleTab(page, 'Session').click()
  const card = court(page, label)
  await card.getByRole('button', { name: 'Open match', ...exact }).click()
  await page.getByRole('button', { name: 'Match done', ...exact }).click()
  const result = page.getByRole('dialog', { name: /^Match \d+ result$/ })
  await result.getByRole('radio', { name: new RegExp(`^Team ${winner}`) }).click()
  await result.getByRole('button', { name: 'Review result', ...exact }).click()
  const confirm = page.getByRole('dialog', { name: 'Confirm match result' })
  await confirm.getByRole('button', { name: `Confirm Team ${winner} wins`, ...exact }).click()
  await expect(confirm).toBeHidden({ timeout: 30_000 })
}

/** Session done › Continue (or Review shortfalls › Continue to finish session) › Confirm Session done. */
export async function sessionDone(page: Page) {
  await page.getByRole('button', { name: 'Session done', ...exact }).click()
  const sheet = page.getByRole('dialog', { name: 'Session done' })
  await expect(sheet).toBeVisible()
  const next = sheet.getByRole('button', { name: /^(Continue|Review shortfalls)$/ })
  const label = await next.textContent()
  await next.click()
  const below: string[] = []
  if (label === 'Review shortfalls') {
    const minimum = page.getByRole('dialog', { name: 'Some players are below the minimum' })
    for (const row of await minimum.getByRole('listitem').all())
      below.push((await row.innerText()).trim())
    await minimum.getByRole('button', { name: 'Continue to finish session', ...exact }).click()
  }
  const confirm = page.getByRole('dialog', { name: 'Finish this session?' })
  await confirm.getByRole('button', { name: 'Confirm Session done', ...exact }).click()
  await expect(confirm).toBeHidden({ timeout: 30_000 })
  return below
}

/** Players › Everyone: the `N games played` count on NAME's card. */
export async function gamesPlayed(page: Page, name: string) {
  await consoleTab(page, 'Players').click()
  await page.getByRole('radio', { name: /^Everyone/ }).click()
  const card = page.getByRole('button', { name: new RegExp(`^${name}, .*, (\\d+) games? played`) })
  const label = (await card.getAttribute('aria-label')) ?? ''
  return Number(/(\d+) games? played/.exec(label)?.[1] ?? Number.NaN)
}

/** Preparation › Overview › Session link: the public session page URL (Queue app, /s/<slug>). */
export async function sessionLink(page: Page, sessionId: string) {
  await page.goto(`${appUrl('queue')}/sessions/${sessionId}/preparation`)
  const link = page.getByRole('textbox', { name: 'Session link', ...exact })
  await expect(link).toHaveValue(/\/s\/[A-Za-z0-9_-]+$/)
  return link.inputValue()
}

/**
 * Session › COURT (Playing) › Open match › Substitute player: the player at `outIndex` in the
 * lineup (Team A then Team B, as the court card lists them) comes off, the only free present
 * player comes in, Who gets this game? = Nobody, Review substitution › Confirm substitution.
 * Tiles show short names (every seeded player reads "E2E"), so they are picked by position.
 */
export async function substituteNobody(page: Page, label: string, outIndex: number) {
  await consoleTab(page, 'Session').click()
  await court(page, label)
    .getByRole('button', { name: 'Open match', ...exact })
    .click()
  await page.getByRole('button', { name: 'Substitute player', ...exact }).click()
  const sheet = page.getByRole('dialog', { name: /^Substitute in match \d+$/ })
  await sheet
    .getByRole('group', { name: "Who's coming off?" })
    .getByRole('button')
    .nth(outIndex)
    .click()
  const replacements = sheet.getByRole('group', { name: 'Replacement' }).getByRole('button')
  await expect(replacements).toHaveCount(1)
  await replacements.first().click()
  await sheet.getByRole('radio', { name: /^Nobody/ }).click()
  await sheet.getByRole('button', { name: 'Review substitution', ...exact }).click()
  const confirm = page.getByRole('dialog', { name: 'Confirm substitution' })
  await expect(confirm.getByText('Nobody', exact)).toBeVisible()
  await confirm.getByRole('button', { name: 'Confirm substitution', ...exact }).click()
  await expect(confirm).toBeHidden({ timeout: 30_000 })
  await page.keyboard.press('Escape')
}

/** Who is on COURT: full names from the lineup buttons ("NAME, Team A, N games played…"). */
export async function playersOn(page: Page, label: string) {
  await consoleTab(page, 'Session').click()
  const buttons = court(page, label).getByRole('button', { name: /, Team [AB], \d+ games? played/ })
  const labels = await buttons.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') ?? node.textContent ?? ''),
  )
  return labels.map((text) => text.split(', Team ')[0] as string)
}

/** The live console header's `Min N games`. */
export async function minimumGames(page: Page) {
  const text = await page
    .getByText(/Min \d+ games?/)
    .first()
    .innerText()
  return Number(/Min (\d+)/.exec(text)?.[1])
}

/**
 * Best-effort cleanup after a journey (pass or fail): the club runs one session at a time, so a
 * session left live would block the next journey. Invalidates its Playing matches, then marks the
 * session invalid (a session not started yet is cancelled). Never part of what a test asserts.
 */
export async function abandonCreatedSessions() {
  for (const sessionId of created.splice(0)) await abandonSession(sessionId)
}

async function abandonSession(sessionId: string) {
  const api = await asQueueMaster()
  try {
    const { session } = await api.get<{ session: { state: string } }>(`/api/sessions/${sessionId}`)
    if (session.state === 'prepared') {
      await api.send('POST', `/api/sessions/${sessionId}/cancel`, { reason: 'E2E cleanup' })
      return
    }
    if (session.state !== 'active') return
    // Manual Queue first, so nothing refills a court. An On court match must go back to the queue:
    // marking the session invalid keeps its players' active holds, and the next session that puts
    // them in a match then gets 409 "This changed since you loaded it" (unique
    // active_player_holds_player_id_key). The sims' finishSession does the same.
    await api.send('PATCH', `/api/sessions/${sessionId}/court-fill`, { mode: 'manual' })
    const { matches } = await api.get<{ matches: { id: string; state: string }[] }>(
      `/api/sessions/${sessionId}/matches`,
    )
    for (const match of matches.filter((m) => m.state === 'on_court'))
      await api.call('POST', `/api/sessions/${sessionId}/matches/${match.id}/send-back`, {
        operationId: randomUUID(),
      })
    for (const match of matches.filter((m) => m.state === 'active'))
      await api.send('POST', `/api/sessions/${sessionId}/matches/${match.id}/invalid`, {
        operationId: randomUUID(),
      })
    await api.send('POST', `/api/sessions/${sessionId}/invalid`, { reason: 'E2E cleanup' })
  } catch (error) {
    // Best effort only, but say so: a session left half cleaned up breaks the next journeys.
    console.warn(`[e2e] cleanup of session ${sessionId} failed: ${String(error)}`)
  } finally {
    await api.dispose()
  }
}
