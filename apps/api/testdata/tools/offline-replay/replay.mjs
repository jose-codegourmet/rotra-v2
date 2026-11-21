// Offline-replay check for go-writes-queue task 5.1. Run it through run.sh (it needs the local stack that run.sh starts).
//
// It drives the real Queue app in a real browser (system Chrome through Playwright): the club account signs in through
// the Go API, downloads the live session, goes offline with the app's own "Simulate offline" switch, records Queue Master
// commands by clicking, goes online and watches the device outbox (packages/data/src/outbox/replay.ts) drain through
// proxy.ts into the Go API and the local Postgres. Nothing here talks to the API except the browser itself, apart from
// the one out-of-band write that makes a stale revision (marked below) and the read-backs that compare the device copy.
//
// Pass means: the outbox is empty, no replay problem, no conflict where none was made, the lost reply was retried with
// the same operation id and saved once, the device copy equals the server's answers and the database rows are right;
// then a second round makes one real conflict and checks it reaches Q-CONFLICT.
import { execFileSync } from 'node:child_process'

const APP = process.env.ROTRA_REPLAY_APP_URL
const PASSWORD = process.env.REPLAY_PASSWORD
const MOVED = (process.env.ROTRA_REPLAY_MOVED ?? '').split(',').filter(Boolean)
const CONTAINER = process.env.ROTRA_REPLAY_DB_CONTAINER ?? 'rotra-replay-db'
const DB_NAME = 'rotra_disposable_replay'
const SID = 'a3000000-0000-4000-8000-000000000003'
const CLUB = 'c9000000-0000-4000-8000-000000000001'
if (!APP || !PASSWORD || !MOVED.length) {
  console.error('Run this through run.sh (it sets the stack variables).')
  process.exit(2)
}
// Local only.
const host = new URL(APP).hostname
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error(`Refusing: ${host} is not a local host.`)
  process.exit(2)
}
if (!/^rotra_disposable/.test(DB_NAME)) process.exit(2)

const { chromium } = await import(
  new URL('../../../../e2e/node_modules/@playwright/test/index.mjs', import.meta.url).href
)
const exact = { exact: true }

const sql = (q) =>
  execFileSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', DB_NAME, '-v', 'ON_ERROR_STOP=1', '-q', '-At', '-c', q],
    { encoding: 'utf8' },
  ).trim()

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  return ok
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const isMoved = (path) => MOVED.some((area) => path === area || path.startsWith(`${area}/`))
const api = []
let phase = 'setup'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' })
const page = await ctx.newPage()
page.on('response', (r) => {
  const url = new URL(r.url())
  if (url.origin === APP && url.pathname.startsWith('/api/'))
    api.push({ phase, method: r.request().method(), path: url.pathname, status: r.status() })
})

// ---- helpers over the UI and the device store ----
const outbox = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('rotra-queue-device')
        open.onsuccess = () => {
          const tx = open.result.transaction(['outbox'])
          tx.objectStore('outbox').getAll().onsuccess = (e) =>
            resolve(
              e.target.result
                .sort((a, b) => a.seq - b.seq)
                .map((c) => ({ name: c.name, text: c.text, op: c.operationId, conflict: Boolean(c.conflict) })),
            )
        }
      }),
  )
const deviceBodies = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('rotra-queue-device')
        open.onsuccess = () => {
          const tx = open.result.transaction(['bodies'])
          tx.objectStore('bodies').getAll().onsuccess = (e) =>
            resolve(Object.fromEntries(e.target.result.map((b) => [b.key.split('|').slice(1).join('|'), b.body])))
        }
      }),
  )

async function signIn() {
  await page.goto(`${APP}/login`)
  await page.getByLabel('Username', exact).fill('smash')
  await page.getByLabel('Password', exact).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', ...exact }).click()
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 60_000 })
}

// The session must be prepared to offer its download (the card is hidden while live), so flip it in the database for the
// download and flip it back. The device copy then follows the live reads, which write through while a copy exists.
async function download() {
  sql(`UPDATE queue_sessions SET state = 'prepared', started_at = NULL WHERE id = '${SID}'`)
  await page.goto(`${APP}/sessions/${SID}/preparation`)
  await page.getByRole('button', { name: /Download for offline use|Update download/ }).click()
  await page.getByText('Ready on this device').first().waitFor({ timeout: 30_000 })
  sql(`UPDATE queue_sessions SET state = 'active', started_at = now() - interval '1 hour' WHERE id = '${SID}'`)
  await page.goto(`${APP}/sessions/${SID}`)
  await page.getByRole('tab', { name: /^Players/ }).click()
  await page.waitForTimeout(2500)
}

let leaked = []
const leakRoute = (route) => {
  leaked.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
  return route.abort()
}
async function setOffline(on) {
  await page.getByRole('button', { name: 'Prototype' }).click()
  await page.getByRole('switch', { name: 'Simulate offline' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  // The app answers from its device copy while offline, so no call should leave the browser; refuse any that tries.
  if (on) {
    leaked = []
    await ctx.route('**/api/**', leakRoute)
  }
  else await ctx.unroute('**/api/**', leakRoute)
}

async function addNewPlayer(name, level) {
  await page.getByRole('button', { name: 'Add late player' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByText('New player', exact).first().click()
  await sheet.getByLabel('Full or display name').fill(name)
  await sheet.getByRole('combobox', { name: /^Level/ }).click()
  await page.getByRole('option', { name: level, ...exact }).click()
  await sheet.getByRole('button', { name: 'Confirm player slot' }).click()
  await page.waitForTimeout(500)
  await sheet.getByRole('button', { name: 'Done', ...exact }).click()
  await page.waitForTimeout(2500) // the roster burst goes out 800 ms after the last tap
}

async function makeMatch(first, second) {
  await page.getByRole('tab', { name: /^Players/ }).click()
  await page.getByRole('radio', { name: /^Everyone/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${first}, `) }).click()
  await page.getByRole('button', { name: new RegExp(`^${second}, `) }).click()
  await page.getByRole('button', { name: /^Make match/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Make match', ...exact }).click()
  await page.waitForTimeout(1500)
}

async function putOnCourt(court) {
  await page.getByRole('tab', { name: /^Queue/ }).click()
  await page.getByRole('button', { name: 'Start', ...exact }).first().click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: court, ...exact }).click()
  await sheet.getByRole('button', { name: 'Put on court', ...exact }).click()
  await page.waitForTimeout(1500)
}

async function startMatch(court) {
  await page.getByRole('tab', { name: /^Session/ }).click()
  await page.getByRole('article', { name: court, ...exact }).getByRole('button', { name: 'Start match', ...exact }).click()
  await page.waitForTimeout(1500)
}

async function matchDone(court) {
  await page.getByRole('tab', { name: /^Session/ }).click()
  await page.getByRole('article', { name: court, ...exact }).getByRole('button', { name: 'Open match', ...exact }).click()
  await page.getByRole('button', { name: 'Match done', ...exact }).click()
  const result = page.getByRole('dialog', { name: /^Match \d+ result$/ })
  await result.getByRole('radio', { name: /^Team A/ }).click()
  await result.getByRole('button', { name: 'Review result', ...exact }).click()
  const confirm = page.getByRole('dialog', { name: 'Confirm match result' })
  await confirm.getByRole('button', { name: 'Confirm Team A wins', ...exact }).click()
  await page.waitForTimeout(2000)
}

async function waitFor(what, fn, timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const v = await fn()
    if (v) return v
    await sleep(500)
  }
  throw new Error(`timed out waiting for ${what}`)
}

// Find the payment toggle of a player on the Payments tab and tap it.
async function markPaid(name) {
  await page.getByRole('tab', { name: /^Payments/ }).click()
  await page.getByRole('switch', { name: `${name} paid`, ...exact }).click()
  await page.waitForTimeout(1500)
}

const snapshotPaths = [
  `/api/sessions/${SID}`,
  `/api/sessions/${SID}/matches`,
  `/api/sessions/${SID}/roster`,
  `/api/sessions/${SID}/payments`,
  `/api/sessions/${SID}/cost`,
]
// Compare the device copy with the server's answer for the same paths. Wire timestamps the server stamps on read are
// ignored by name.
const volatile = new Set(['checkedAt', 'generatedAt', 'now'])
const strip = (v) =>
  Array.isArray(v)
    ? v.map(strip)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).filter(([k]) => !volatile.has(k)).map(([k, x]) => [k, strip(x)]))
      : v
async function copyEqualsServer() {
  const copy = await deviceBodies()
  const diffs = []
  for (const path of snapshotPaths) {
    const res = await page.request.get(`${APP}${path}`)
    const server = strip(await res.json())
    const kept = strip(copy[path])
    if (JSON.stringify(server) !== JSON.stringify(kept)) diffs.push(path)
  }
  return diffs
}

try {
  // ============ setup ============
  await signIn()
  check('sign in through Go (UI, proxy, Go, Postgres)', true)
  await download()
  const downloaded = Object.keys(await deviceBodies())
  check('session downloaded to the device (all session reads copied)', snapshotPaths.every((p) => downloaded.includes(p)))

  // ============ round 1: record offline, replay, no conflict ============
  phase = 'offline-1'
  await setOffline(true)
  await addNewPlayer('Zed Newbie', 'Intermediate Mid')
  const first = await outbox()
  if (
    !check(
      'offline recording works: the add reached the outbox (roster.batch)',
      first.some((c) => c.name === 'roster.batch'),
      `outbox: ${first.map((c) => c.name).join(',') || 'empty'}; an empty outbox here means the app refused the offline change ("isn't connected to saved data yet")`,
    )
  )
    throw new Error('the app did not record the offline change, so there is nothing to replay')
  await page.getByRole('tab', { name: /^Players/ }).click()
  await page.getByRole('radio', { name: /^Everyone/ }).click()
  await page.getByRole('switch', { name: 'Ivy present', ...exact }).click() // Ivy was away
  await page.waitForTimeout(2500)
  await makeMatch('Hal', 'Zed') // Zed is a row this device created: its ids are learned on replay
  await putOnCourt('Court 1')
  await startMatch('Court 1')
  await matchDone('Court 1')
  await markPaid('Hal Guest')
  const recorded = await outbox()
  console.log('recorded offline:', recorded.map((c) => `${c.name} [${c.text}]`).join(' | '))
  check('commands recorded in the outbox in order', recorded.length >= 6, `${recorded.length} commands`)
  check('no API call left the browser while offline', leaked.length === 0, leaked.join(', '))
  const names = recorded.map((c) => c.name)
  for (const need of ['roster.batch', 'queue.make', 'match.place', 'match.start', 'match.complete'])
    check(`recorded ${need}`, names.includes(need))
  check('recorded a payments mark', names.some((n) => n.startsWith('payments.')))
  check('recorded a presence change', names.some((n) => n.startsWith('roster.presence')))
  check('no operation id repeats in the outbox', new Set(recorded.map((c) => c.op)).size === recorded.length)

  // Lost reply: the first time the match result goes out, let it reach Go and then drop the answer.
  const lost = []
  const resultCall = /\/api\/sessions\/[^/]+\/matches\/[^/]+\/(result|complete)$/
  let dropped = false
  await page.route('**/api/sessions/**', async (route) => {
    const req = route.request()
    if (req.method() === 'POST' && resultCall.test(new URL(req.url()).pathname)) {
      const op = JSON.parse(req.postData() ?? '{}').operationId
      if (!dropped) {
        dropped = true
        const res = await route.fetch()
        lost.push({ op, status: res.status(), attempt: 1 })
        return route.abort('failed')
      }
      lost.push({ op, attempt: 2 })
    }
    return route.continue()
  })

  phase = 'replay-1'
  await setOffline(false)
  await sleep(1000)
  // The first attempt may stop the run at the dropped reply; Retry sync (or the next reconnect) goes on from there.
  const started = Date.now()
  let retried = 0
  let retryHow = ''
  while (Date.now() - started < 90_000) {
    const left = await outbox()
    if (!left.length) break
    if (left.some((c) => c.conflict)) break
    if (dropped && retried < 3) {
      // The run stops at the dropped reply. Give it a moment, then retry the way a Queue Master can: Retry sync when the app
      // offers it, otherwise by reconnecting (the app clears its "needs attention" flag after a partial run, see the plan).
      await sleep(2500)
      if ((await outbox()).length) {
        await page.getByRole('button', { name: /^Sync status/ }).first().click().catch(() => {})
        await page.waitForTimeout(800)
        const retry = page.getByRole('button', { name: /Retry sync/ }).first()
        if (await retry.isVisible().catch(() => false)) {
          await retry.click()
          retryHow = 'Retry sync button'
        } else {
          retryHow = 'reconnect (the sync dialog offered no Retry sync)'
          await page.keyboard.press('Escape').catch(() => {})
          await setOffline(true)
          await setOffline(false)
        }
        retried++
        await page.keyboard.press('Escape').catch(() => {})
      }
    }
    await sleep(1000)
  }
  await page.unroute('**/api/sessions/**')
  console.log('retry went through:', retryHow || 'none needed')
  const after = await outbox()
  check('replay 1: outbox empty (pending count 0)', after.length === 0, `${after.length} left`)
  check('replay 1: no command marked as a conflict', !after.some((c) => c.conflict))
  check('replay 1: the lost reply was dropped once and the same operation id sent again', lost.length === 2 && lost[0].op === lost[1].op && lost[0].op, JSON.stringify(lost))
  const decisions = sql(`SELECT count(*) FROM match_decisions d JOIN matches m ON m.id = d.match_id WHERE m.session_id = '${SID}'`)
  check('replay 1: the dropped-reply result is saved once (one decision row)', decisions === '1', `match_decisions rows: ${decisions}`)
  const pill = await page.getByRole('button', { name: /^Sync status/ }).first().getAttribute('aria-label')
  check('replay 1: sync status shows no problem', !/needs attention|problem/i.test(pill ?? ''), pill ?? '')
  await sleep(2500) // the device copy is downloaded again after a drained session
  const diffs = await copyEqualsServer()
  check('replay 1: re-downloaded device copy equals the server', diffs.length === 0, diffs.join(', '))

  // Database rows the replay should have written.
  const zed = sql(`SELECT count(*) FROM club_players WHERE club_id = '${CLUB}' AND display_name = 'Zed Newbie'`)
  check('db: Zed Newbie saved as a club player', zed === '1', zed)
  const zedRoster = sql(
    `SELECT count(*) FROM session_players sp JOIN club_players cp ON cp.id = sp.club_player_id WHERE sp.session_id = '${SID}' AND cp.display_name = 'Zed Newbie' AND sp.present`,
  )
  check('db: Zed is on the roster and present', zedRoster === '1', zedRoster)
  const ivy = sql(
    `SELECT sp.present FROM session_players sp JOIN club_players cp ON cp.id = sp.club_player_id WHERE sp.session_id = '${SID}' AND cp.display_name = 'Ivy Guest'`,
  )
  check('db: Ivy marked present', ivy === 't', ivy)
  const match = sql(`SELECT state FROM matches WHERE session_id = '${SID}' AND removed_at IS NULL ORDER BY match_no`)
  check('db: one match, finished', match === 'completed' || match === 'done', match)
  const marks = sql(`SELECT count(*) FROM session_payment_marks WHERE session_id = '${SID}'`)
  check('db: a payment mark saved', Number(marks) >= 1, marks)

  // ============ round 2: one real stale revision must reach Q-CONFLICT ============
  phase = 'offline-2'
  await setOffline(true)
  await makeMatch('Jo', 'Ivy')
  await putOnCourt('Court 2')
  await startMatch('Court 2')
  const rec2 = await outbox()
  check('round 2 recorded make, place and start', rec2.map((c) => c.name).join(',') === 'queue.make,match.place,match.start', rec2.map((c) => c.name).join(','))
  check('round 2: no API call left the browser while offline', leaked.length === 0, leaked.join(', '))
  // Another device changes the same match before ours reaches the server: the one out-of-band write (a real second device).
  let bumped = false
  let sentBack = 0
  await page.route('**/api/sessions/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const m = /^\/api\/sessions\/([^/]+)\/matches\/([^/]+)\/start$/.exec(path)
    if (req.method() === 'POST' && m && !bumped) {
      bumped = true
      const res = await page.request.post(`${APP}/api/sessions/${m[1]}/matches/${m[2]}/send-back`, {
        data: { operationId: crypto.randomUUID() },
      })
      sentBack = res.status()
      console.log(`second device sent the match back to the queue first: ${res.status()}`)
    }
    return route.continue()
  })
  phase = 'replay-2'
  await setOffline(false)
  await waitFor('the conflict', async () => (await outbox()).some((c) => c.conflict), 60_000).catch(() => {})
  await page.unroute('**/api/sessions/**')
  const rest = await outbox()
  check('round 2: the second device\'s send-back was accepted', sentBack === 200, String(sentBack))
  const conflicted = rest.filter((c) => c.conflict)
  check('round 2: exactly the match start is held as a conflict', conflicted.length === 1 && conflicted[0].name === 'match.start', rest.map((c) => `${c.name}${c.conflict ? '!' : ''}`).join(','))
  check('round 2: the commands before it were saved (make, place left the outbox)', !rest.some((c) => c.name === 'queue.make' || c.name === 'match.place'))
  await page.getByRole('button', { name: /^Sync status/ }).first().click().catch(() => {})
  await page.waitForTimeout(800)
  const dialogText = (await page.getByRole('dialog').innerText().catch(() => '')).replace(/\s+/g, ' ')
  console.log('sync dialog:', dialogText.slice(0, 300))
  await page.keyboard.press('Escape').catch(() => {})
} catch (error) {
  check('script ran to the end', false, String(error).split('\n')[0])
  await page.screenshot({ path: `${process.env.ROTRA_REPLAY_STATE ?? '.'}/failure.png`, fullPage: true }).catch(() => {})
}

// ============ path audit ============
const seen = new Map()
for (const r of api) {
  const key = `${r.method} ${r.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id')}`
  const e = seen.get(key) ?? { statuses: new Set(), phases: new Set() }
  e.statuses.add(r.status)
  e.phases.add(r.phase)
  seen.set(key, e)
}
console.log('\nAPI calls the browser made (method path -> statuses):')
for (const [k, v] of [...seen].sort()) console.log(`  ${k} -> ${[...v.statuses].join(',')}  [${[...v.phases].join(',')}]`)
const unmoved = [...seen.keys()].filter((k) => !isMoved(k.split(' ')[1]))
check('every API path the device used is under a moved prefix', unmoved.length === 0, unmoved.join(', '))
const server5xx = api.filter((r) => r.status >= 500)
check('no 5xx answer', server5xx.length === 0, server5xx.map((r) => `${r.method} ${r.path} ${r.status}`).join(', '))

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
