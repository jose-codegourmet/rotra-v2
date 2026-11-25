import { APPS, type AppName, GO_CLOCK_URL } from './stack.ts'

/** What each server's clock control (src/server-clock.mjs, or the Go API's test clock) reports. */
export type ClockState = { nowMs: number; offsetMs: number; realNowMs: number }

const APP_NAMES = Object.keys(APPS) as AppName[]
/** The three apps' clock controls and the Go API's (apps/api/internal/testclock): the same contract. */
type ClockTarget = AppName | 'go'
const CLOCK_TARGETS: ClockTarget[] = [...APP_NAMES, 'go']
const clockUrl = (target: ClockTarget) =>
  target === 'go' ? GO_CLOCK_URL : `http://127.0.0.1:${APPS[target].clockPort}/clock`

async function control(app: ClockTarget, body?: unknown): Promise<ClockState> {
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
 * Sets the server clock of all three apps and the Go API to `nowMs` (epoch ms); it then keeps ticking in real
 * time. Never earlier than real time (the database keeps real time). Browser time is separate: use
 * Playwright's `page.clock` for that.
 */
export async function setClock(nowMs: number) {
  return Promise.all(CLOCK_TARGETS.map((target) => control(target, { nowMs })))
}

/** Moves every server clock `ms` ahead of the Queue app's current virtual now. */
export async function advanceClock(ms: number) {
  const { nowMs } = await control('queue')
  return setClock(nowMs + ms)
}

/** Back to real time on all three apps and the Go API. */
export async function resetClock() {
  return Promise.all(CLOCK_TARGETS.map((target) => control(target, { reset: true })))
}

export async function readClock(app: ClockTarget = 'queue') {
  return control(app)
}
