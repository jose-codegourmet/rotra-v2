import { type Browser, expect, type Page } from '@playwright/test'
import { readAccounts } from '../accounts.ts'
import { type AppName, appUrl } from '../stack.ts'

/**
 * One browser context per role, so each keeps its own app cookies. Its clock is installed at real
 * time (it keeps ticking); `jumpTo` in ./time.ts moves it with the server clocks.
 */
export async function rolePage(browser: Browser) {
  // Reduced motion: with the installed clock, sheet close animations never finish, so a closed
  // sheet stays on screen (the same reason watch mode sets it).
  const context = await browser.newContext({
    baseURL: appUrl('queue'),
    timezoneId: 'Asia/Manila',
    reducedMotion: 'reduce',
  })
  await context.clock.install()
  return context.newPage()
}

async function fill(
  page: Page,
  app: AppName,
  idLabel: string,
  identifier: string,
  password: string,
) {
  await page.goto(`${appUrl(app)}/login`)
  await page.getByLabel(idLabel, { exact: true }).fill(identifier)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 60_000 })
}

/** Admin: the seeded platform owner signs in on the admin app's login screen. */
export async function signInAdmin(page: Page) {
  const { admin } = readAccounts()
  await fill(page, 'admin', 'Email', admin.email, admin.password)
}

/** Queue: the seeded club account (the Queue Master) signs in with the club username. */
export async function signInQueueMaster(page: Page) {
  const { club } = readAccounts()
  await fill(page, 'queue', 'Username', club.username, club.password)
}

/** Player Information: seeded player `n` signs in with their email. */
export async function signInPlayer(page: Page, n: number) {
  const player = readAccounts().players.find((entry) => entry.n === n)
  if (!player) throw new Error(`[e2e] No seeded player ${n}.`)
  await fill(page, 'player', 'Email', player.email, player.password)
}
