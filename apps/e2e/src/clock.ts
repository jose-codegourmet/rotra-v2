import { APPS, type AppName } from './stack.ts'

/** What each app server's clock control (src/server-clock.mjs) reports. */
export type ClockState = { nowMs: number; offsetMs: number; realNowMs: number }

const APP_NAMES = Object.keys(APPS) as AppName[]
const clockUrl = (app: AppName) => `http://127.0.0.1:${APPS[app].clockPort}/clock`

async function control(app: AppName, body?: unknown): Promise<ClockState> {
  const response = await fetch(clockUrl(app), {
    method: body === undefined ? 'GET' : 'POST',
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  })
  const reply = (await response.json()) as ClockState & { error?: string }
  if (!response.ok) throw new Error(`[e2e clock] ${app}: ${response.status} ${reply.error ?? ''}`)
  return reply
}

/**
 * Sets the server clock of all three apps to `nowMs` (epoch ms); it then keeps ticking in real
 * time. Never earlier than real time (the database keeps real time). Browser time is separate: use
 * Playwright's `page.clock` for that.
 */
export async function setClock(nowMs: number) {
  return Promise.all(APP_NAMES.map((app) => control(app, { nowMs })))
}

/** Moves every server clock `ms` ahead of the Queue app's current virtual now. */
export async function advanceClock(ms: number) {
  const { nowMs } = await control('queue')
  return setClock(nowMs + ms)
}

/** Back to real time on all three apps. */
export async function resetClock() {
  return Promise.all(APP_NAMES.map((app) => control(app, { reset: true })))
}

export async function readClock(app: AppName = 'queue') {
  return control(app)
}
