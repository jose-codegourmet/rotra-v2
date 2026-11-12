import type { BrowserContext, Page } from '@playwright/test'
import { readClock, setClock } from '../clock.ts'

export const MINUTE = 60_000

/**
 * Virtual time for a UI journey: every app server's clock (setClock) and each role's browser clock
 * (Playwright's `clock`, installed by `rolePage`) jump to `nowMs` together and then keep ticking
 * in real time. Never earlier than real time (the database keeps real time).
 */
export async function jumpTo(nowMs: number, pages: Page[]) {
  await setClock(nowMs)
  await Promise.all(contextsOf(pages).map((context) => context.clock.setSystemTime(nowMs)))
}

/** Moves server and browser clocks `ms` past the Queue app's current virtual now. */
export async function advance(ms: number, pages: Page[]) {
  const { nowMs } = await readClock('queue')
  await jumpTo(nowMs + ms, pages)
  return nowMs + ms
}

export async function virtualNow() {
  return (await readClock('queue')).nowMs
}

function contextsOf(pages: Page[]): BrowserContext[] {
  return [...new Set(pages.map((page) => page.context()))]
}
