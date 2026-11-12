// E2E SERVER TEST CLOCK. Loaded into the app server processes ONLY by the e2e runner, through
// `NODE_OPTIONS=--import <this file>` (see src/stack.ts appServerEnv). Never import it from app code.
//
// It does nothing unless ROTRA_E2E_CLOCK=1, and then refuses to start (throws, so the server exits)
// unless DATABASE_URL, DIRECT_URL and SUPABASE_URL pass the e2e guard. Once active it replaces the
// global Date so that now = (virtual base set by the control call) + real time elapsed since then,
// and serves a control endpoint on 127.0.0.1:$ROTRA_E2E_CLOCK_PORT:
//
//   GET  /clock                 -> { nowMs, offsetMs, realNowMs }
//   POST /clock {"nowMs": n}    -> sets the virtual now; refused (409) if n is before real time
//   POST /clock {"reset": true} -> back to real time
//
// `next dev` also forks short-lived workers (jest-worker) that load this file. The first process to
// bind the port (the request-serving server) leads; it writes the offset to $ROTRA_E2E_CLOCK_STATE
// and every other process follows that file, so all of them share one virtual clock.
//
// The virtual time never goes behind real time: Postgres `now()` (column defaults, one trigger)
// keeps real time, so the app's clock must never be earlier than the database's.
import { readFileSync, unwatchFile, watchFile, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { assertE2eEnv } from './guard.ts'

const env = process.env
// `next dev` runs a CLI parent that forks the request-serving child; only the child gets the clock.
const isNextCli = /[\\/]next[\\/]dist[\\/]bin[\\/]next$/.test(process.argv[1] ?? '')

if (env.ROTRA_E2E_CLOCK === '1' && !isNextCli && !globalThis.__rotraE2eClock) {
  assertE2eEnv(env)
  const port = Number(env.ROTRA_E2E_CLOCK_PORT)
  const stateFile = env.ROTRA_E2E_CLOCK_STATE
  if (!Number.isInteger(port) || port <= 0 || !stateFile)
    throw new Error(
      '[e2e clock] Refusing: ROTRA_E2E_CLOCK_PORT or ROTRA_E2E_CLOCK_STATE is not set.',
    )

  const RealDate = Date
  const realNow = RealDate.now.bind(RealDate)
  let offsetMs = 0
  const now = () => realNow() + offsetMs
  const readShared = () => {
    try {
      const shared = JSON.parse(readFileSync(stateFile, 'utf8')).offsetMs
      if (Number.isFinite(shared)) offsetMs = shared
    } catch {
      // No state yet: real time.
    }
  }
  const setOffset = (value) => {
    offsetMs = value
    writeFileSync(stateFile, JSON.stringify({ offsetMs: value }))
  }
  readShared()

  const VirtualDate = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now()] : args, newTarget)
    },
    apply() {
      return new RealDate(now()).toString()
    },
    get(target, property, receiver) {
      if (property === 'now') return now
      return Reflect.get(target, property, receiver)
    },
  })
  globalThis.Date = VirtualDate
  globalThis.__rotraE2eClock = { now, realDate: RealDate }

  const reply = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  const state = () => ({ nowMs: now(), offsetMs, realNowMs: realNow() })

  const server = createServer((req, res) => {
    if (req.url !== '/clock') return reply(res, 404, { error: 'not_found' })
    if (req.method === 'GET') return reply(res, 200, state())
    if (req.method !== 'POST') return reply(res, 405, { error: 'method_not_allowed' })
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      let body
      try {
        body = JSON.parse(raw || '{}')
      } catch {
        return reply(res, 422, { error: 'invalid_json' })
      }
      if (body.reset === true) {
        setOffset(0)
        return reply(res, 200, state())
      }
      const target = body.nowMs
      if (typeof target !== 'number' || !Number.isFinite(target))
        return reply(res, 422, { error: 'nowMs must be a number' })
      const real = realNow()
      if (target < real)
        return reply(res, 409, {
          error: 'nowMs is before real time; the database clock cannot go back',
          realNowMs: real,
        })
      setOffset(target - real)
      return reply(res, 200, state())
    })
  })
  server.on('error', (error) => {
    if (error.code !== 'EADDRINUSE') {
      console.error(`[e2e clock] control server on 127.0.0.1:${port} failed:`, error.message)
      process.exit(1)
    }
    // Another process of this app leads: follow its offset.
    watchFile(stateFile, { interval: 50, persistent: false }, readShared)
    process.once('exit', () => unwatchFile(stateFile))
  })
  server.on('listening', () => {
    setOffset(0)
    console.log(
      `[e2e clock] active in pid ${process.pid}; control on http://127.0.0.1:${port}/clock`,
    )
  })
  server.listen(port, '127.0.0.1')
  // Never keep the app process alive on its own.
  server.unref()
}
