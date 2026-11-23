import { RealRequestError, realRequest } from '../real/client'

export type LiveChange = { topic: string; version: number | null; kind: string }

export type LiveStreamOptions = {
  origin: string
  topics: readonly string[]
  onChanged: (change: LiveChange) => void
  /** `resumed` is false when no last event id was sent: the screen re-reads once. */
  onReady: (resumed: boolean) => void
}

type Ticket = { ticket: string; topics: string[] }

const MAX_BACKOFF_MS = 30_000
/** A tab hidden this long closes its stream; coming back reopens it with the last event id. */
const HIDDEN_CLOSE_MS = 60_000

/** Backoff for failure number `attempt` (1, 2, ...): 1 s doubling to 30 s, with jitter. */
export function backoffMs(attempt: number, random: number = Math.random()): number {
  const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.max(0, attempt - 1))
  return Math.round(base * (0.5 + random * 0.5))
}

/**
 * One live stream (R1, B-41): asks the app's own `/api/stream/ticket` for a single-use ticket, opens
 * `GET <origin>/stream?ticket=...&lastEventId=...` and reports `changed` messages. Tickets are single
 * use, so a failed or closed stream always asks for a new ticket (the browser's own retry would send
 * the spent one). The browser's access pass refresh on `expired` is `realRequest`'s.
 *
 * It never throws and never shows anything: on a refusal (429, 401, 403, 404) it stops for good, and on
 * other failures it retries with backoff up to 30 s. Either way the Refresh bar, pull-down and
 * tab-return refresh keep working as before. Returns `stop`.
 */
export function startLiveStream(options: LiveStreamOptions): () => void {
  if (typeof EventSource === 'undefined' || options.topics.length === 0) return () => {}
  let stopped = false
  let source: EventSource | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let hiddenTimer: ReturnType<typeof setTimeout> | null = null
  let lastEventId = ''
  let failures = 0
  let generation = 0

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  const close = () => {
    generation++
    clearTimer()
    source?.close()
    source = null
  }
  const retryIn = (ms: number) => {
    if (stopped) return
    clearTimer()
    timer = setTimeout(() => void connect(), ms)
  }
  const fail = () => {
    close()
    failures++
    retryIn(backoffMs(failures))
  }

  async function connect() {
    if (stopped || document.hidden) return
    const mine = ++generation
    let ticket: Ticket
    try {
      ticket = await realRequest<Ticket>('/api/stream/ticket', {
        method: 'POST',
        body: { topics: options.topics.slice(0, 16) },
      })
    } catch (error) {
      if (stopped || mine !== generation) return
      // Refused (429, no right to read, no such page, not wired yet): stay silent, the Refresh bar is the fallback.
      if (error instanceof RealRequestError && [401, 403, 404, 405, 429].includes(error.status)) {
        stopped = true
        return
      }
      failures++
      retryIn(backoffMs(failures))
      return
    }
    if (stopped || mine !== generation) return
    const resumed = lastEventId !== ''
    const url = new URL('/stream', options.origin)
    url.searchParams.set('ticket', ticket.ticket)
    if (resumed) url.searchParams.set('lastEventId', lastEventId)
    const next = new EventSource(url.toString())
    source = next
    const remember = (event: MessageEvent) => {
      if (event.lastEventId) lastEventId = event.lastEventId
    }
    next.addEventListener('ready', (event) => {
      remember(event as MessageEvent)
      failures = 0
      options.onReady(resumed)
    })
    next.addEventListener('changed', (event) => {
      remember(event as MessageEvent)
      try {
        const data = JSON.parse((event as MessageEvent).data) as Partial<LiveChange>
        if (typeof data.topic !== 'string') return
        options.onChanged({
          topic: data.topic,
          version: typeof data.version === 'number' ? data.version : null,
          kind: typeof data.kind === 'string' ? data.kind : 'changed',
        })
      } catch {
        // An unreadable message is a missed hint; the next one, or Refresh, catches up.
      }
    })
    next.addEventListener('reconnect', (event) => {
      let wait = 1000
      try {
        const data = JSON.parse((event as MessageEvent).data) as { retryMs?: unknown }
        if (typeof data.retryMs === 'number') wait = Math.min(Math.max(data.retryMs, 0), 5000)
      } catch {
        // keep the default wait
      }
      close()
      retryIn(wait)
    })
    next.onerror = () => {
      // The browser would retry the spent ticket; close and ask for a new one instead.
      if (stopped || source !== next) return
      fail()
    }
  }

  const onVisibility = () => {
    if (stopped) return
    if (document.hidden) {
      hiddenTimer = setTimeout(close, HIDDEN_CLOSE_MS)
    } else {
      if (hiddenTimer) clearTimeout(hiddenTimer)
      hiddenTimer = null
      if (!source && !timer) void connect()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
  void connect()

  return () => {
    stopped = true
    close()
    if (hiddenTimer) clearTimeout(hiddenTimer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
