import { sessionEstimate } from './fragments.js'
import { active, all, courtMatches, freeCourts, P, waiting } from './helpers.js'
import { blockOf } from './rules/court-fill.js'
import { restInfo } from './screens/console-board.js'
import { duePerHead } from './screens/session-record.js'
import { oldToNewLevel, S, save, seedPlayers } from './state.js'

// ---------- Session record (read-only history) ----------
function seededRng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Balanced doubles split for the simulated example sessions: the pairing with the closest level totals.
function evenSplit(pick, lv) {
  return [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ]
    .map(([a, b]) => {
      const A = a.map((i) => pick[i]),
        B = b.map((i) => pick[i])
      return {
        A,
        B,
        diff: Math.abs(A.reduce((t, p) => t + lv(p), 0) - B.reduce((t, p) => t + lv(p), 0)),
      }
    })
    .sort((x, y) => x.diff - y.diff)[0]
}
const pidRange = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => `p${a + i}`)
function simulateHistory(spec) {
  const r = seededRng(spec.seed)
  const d = new Date()
  d.setDate(d.getDate() - spec.ago)
  d.setHours(spec.h, 0, 0, 0)
  const start = d.getTime(),
    end = start + spec.len * 3600e3
  const courts = Array.from({ length: spec.courts }, (_, i) => ({
    id: `c${i + 1}`,
    label: `Court ${i + 1}`,
  }))
  const roster = spec.players.map((pid) => ({
    pid,
    level: (P(pid) || {}).sugg ?? 4,
    present: true,
    locked: true,
    presentAt: start,
  }))
  const lv = (pid) => roster.find((x) => x.pid === pid).level
  const s = {
    id: spec.id,
    title: spec.title,
    start,
    end,
    venue: spec.venue,
    address: spec.address,
    courts,
    singles: false,
    doubles: true,
    mode: 'fair',
    minimum: spec.minimum,
    minAuto: spec.minAuto !== false,
    notes: spec.notes || '',
    status: spec.status,
    download: 'none',
    roster,
    matches: [],
    seq: 0,
    published: spec.published ? { slides: [0, 1], offDay: false, at: end } : null,
    startedAt: start,
    finalizedAt: end + 6e5,
    invalidReason: spec.reason || null,
    finance: spec.finance || null,
    payments: {},
  }
  if (spec.finance && spec.status === 'finalized')
    roster.forEach((x, i) => {
      if (i < roster.length - (spec.unpaid || 0))
        s.payments[x.pid] = { at: start + (i % 40) * 6e4, amount: duePerHead(s) }
    })
  const games = {},
    free = {},
    courtFree = {}
  roster.forEach((x) => {
    games[x.pid] = 0
    free[x.pid] = start + Math.floor(r() * 20) * 6e4
  })
  courts.forEach((c, i) => {
    courtFree[c.id] = start + (3 + i * 2) * 6e4
  })
  let seq = 0
  for (let guard = 0; guard < 400; guard++) {
    const c = courts.reduce((a, b) => (courtFree[a.id] <= courtFree[b.id] ? a : b))
    const t0 = courtFree[c.id]
    if (t0 > end - 12 * 6e4) break
    const avail = roster
      .filter((x) => free[x.pid] <= t0)
      .sort((a, b) => games[a.pid] - games[b.pid] || free[a.pid] - free[b.pid])
    if (avail.length < 4) {
      courtFree[c.id] = t0 + 3 * 6e4
      continue
    }
    const pick = avail.slice(0, 4).map((x) => x.pid)
    const o = evenSplit(pick, lv)
    const sa = o.A.reduce((t, p) => t + lv(p), 0),
      sb = o.B.reduce((t, p) => t + lv(p), 0)
    const aWins = r() < 1 / (1 + 10 ** ((sb - sa) / 4))
    const dur = 13 + Math.floor(r() * 8)
    seq += 1
    const invalid = (spec.invalidSeq || []).includes(seq)
    const withScore = !invalid && r() < 0.6,
      lose = 9 + Math.floor(r() * 11)
    s.matches.push({
      id: `${spec.id}-m${seq}`,
      seq,
      format: 'doubles',
      teamA: o.A,
      teamB: o.B,
      status: invalid ? 'invalid' : 'done',
      origin: r() < 0.7 ? 'auto' : 'manual',
      protected: false,
      courts: [c.id],
      subs: [],
      pos: seq,
      startedAt: t0,
      endedAt: t0 + dur * 6e4,
      winner: invalid ? null : aWins ? 'A' : 'B',
      scoreA: withScore ? (aWins ? 21 : lose) : undefined,
      scoreB: withScore ? (aWins ? lose : 21) : undefined,
    })
    pick.forEach((p) => {
      if (!invalid) games[p] += 1
      free[p] = t0 + dur * 6e4 + (1 + Math.floor(r() * 6)) * 6e4
    })
    courtFree[c.id] = t0 + (dur + 2) * 6e4
  }
  s.seq = seq
  return s
}
// Live example sessions: the night so far is simulated up to now, so courts are mid-game, players have
// different game counts and waits vary. A match still running at "now" stays in play.
function simulateLive(spec) {
  const r = seededRng(spec.seed),
    now = Date.now()
  const start = now - (now % 6e4) - spec.elapsed * 6e4,
    end = start + spec.len * 3600e3
  const courts = Array.from({ length: spec.courts }, (_, i) => ({
    id: `c${i + 1}`,
    label: `Court ${i + 1}`,
  }))
  const late = spec.late || {}
  const roster = spec.players.map((pid) => ({
    pid,
    level: (P(pid) || {}).sugg ?? 3,
    present: !(spec.away || []).includes(pid),
    locked: true,
    presentAt: start + (late[pid] || 0) * 6e4,
  }))
  const s = {
    id: `demo-live-${spec.key}-${now.toString(36)}`,
    demo: spec.key,
    title: spec.title,
    start,
    end,
    venue: spec.venue,
    address: spec.address,
    courts,
    singles: false,
    doubles: true,
    mode: 'fair',
    minimum: 0,
    minAuto: spec.minimum == null,
    notes: spec.notes || '',
    status: 'active',
    download: 'ready',
    roster,
    waitlist: [],
    requests: [],
    matches: [],
    seq: 0,
    published: null,
    startedAt: start,
    finance: spec.finance || null,
    payments: {},
    courtFill: 'manual',
  }
  s.minimum = spec.minimum ?? sessionEstimate(s).low
  const lv = (pid) => roster.find((x) => x.pid === pid).level
  // A small per-player lean (some get picked a little more often) keeps game counts from all being equal.
  const games = {},
    free = {},
    courtFree = {},
    lean = {}
  roster.forEach((x) => {
    games[x.pid] = 0
    lean[x.pid] = r() * 1.6
    free[x.pid] = x.present ? x.presentAt + Math.floor(r() * 6) * 6e4 : Infinity
  })
  courts.forEach((c, i) => {
    courtFree[c.id] = start + (2 + i * 2) * 6e4
  })
  let seq = 0
  for (let guard = 0; guard < 400; guard++) {
    const c = courts.reduce((a, b) => (courtFree[a.id] <= courtFree[b.id] ? a : b))
    const t0 = courtFree[c.id]
    if (t0 > now - 6e4) break
    const avail = roster
      .filter((x) => free[x.pid] <= t0)
      .sort(
        (a, b) =>
          games[a.pid] + lean[a.pid] - games[b.pid] - lean[b.pid] || free[a.pid] - free[b.pid],
      )
    if (avail.length < 4) {
      courtFree[c.id] = t0 + 3 * 6e4
      continue
    }
    const pick = avail.slice(0, 4).map((x) => x.pid),
      o = evenSplit(pick, lv)
    const t1 = t0 + (13 + Math.floor(r() * 8)) * 6e4
    seq += 1
    const m = {
      id: `${s.id}-m${seq}`,
      seq,
      format: 'doubles',
      teamA: o.A,
      teamB: o.B,
      status: 'active',
      origin: r() < 0.7 ? 'auto' : 'manual',
      protected: false,
      courts: [c.id],
      subs: [],
      pos: seq,
      startedAt: t0,
    }
    if (t1 > now) {
      pick.forEach((p) => {
        free[p] = Infinity
      })
      courtFree[c.id] = Infinity
    } else {
      const sa = o.A.reduce((t, p) => t + lv(p), 0),
        sb = o.B.reduce((t, p) => t + lv(p), 0)
      const aWins = r() < 1 / (1 + 10 ** ((sb - sa) / 4)),
        withScore = r() < 0.6,
        lose = 9 + Math.floor(r() * 11)
      Object.assign(m, {
        status: 'done',
        endedAt: t1,
        winner: aWins ? 'A' : 'B',
        scoreA: withScore ? (aWins ? 21 : lose) : undefined,
        scoreB: withScore ? (aWins ? lose : 21) : undefined,
      })
      pick.forEach((p) => {
        games[p] += 1
        free[p] = t1 + (1 + Math.floor(r() * (spec.rest || 6))) * 6e4
      })
      courtFree[c.id] = t1 + 2 * 6e4
    }
    s.matches.push(m)
  }
  // The newest match is still getting ready on its court.
  if (spec.ready) {
    const m = active(s).sort((a, b) => b.startedAt - a.startedAt)[0]
    if (m) {
      m.status = 'oncourt'
      m.placedAt = Math.max(m.startedAt, now - 2 * 6e4)
      delete m.startedAt
    }
  }
  // Waiting matches: the longest-waiting free players first, then players still on court (planned ahead, so blocked).
  const busy = new Set(courtMatches(s).flatMap(all))
  const order = roster
    .filter((x) => x.present && !busy.has(x.pid))
    .sort((a, b) => restInfo(s, b.pid).mins - restInfo(s, a.pid).mins)
    .map((x) => x.pid)
    .concat(roster.filter((x) => busy.has(x.pid)).map((x) => x.pid))
  const fill = spec.fill ? freeCourts(s) : []
  for (let i = 0; i < (spec.queue || 0) + fill.length && (i + 1) * 4 <= order.length; i++) {
    const o = evenSplit(order.slice(i * 4, i * 4 + 4), lv)
    seq += 1
    s.matches.push({
      id: `${s.id}-m${seq}`,
      seq,
      format: 'doubles',
      teamA: o.A,
      teamB: o.B,
      status: 'waiting',
      origin: 'auto',
      protected: false,
      courts: [],
      subs: [],
      pos: seq,
    })
  }
  // Full house: a court that just freed up already has the next match playing on it.
  fill.forEach((c, i) => {
    const m = waiting(s).find((x) => !blockOf(s, x))
    if (m) {
      m.status = 'active'
      m.courts = [c.id]
      m.startedAt = now - (2 + i) * 6e4
    }
  })
  s.seq = seq
  if (s.finance)
    roster.forEach((x, i) => {
      if (x.present && i % 5 !== 4)
        s.payments[x.pid] = { at: x.presentAt + 3 * 6e4, amount: duePerHead(s) }
    })
  return s
}
const BANILAD = { venue: 'Banilad Sports Hub', address: 'Gov. M. Cuenco Ave, Banilad, Cebu City' }
const LAHUG = { venue: 'Lahug Covered Court', address: 'Salinas Dr, Lahug, Cebu City' }
const TALAMBAN = { venue: 'Talamban Shuttle Courts', address: 'Talamban, Cebu City' }
// Prototype › Demo scenarios: one live example at a time. The two flexibility examples keep their own builder (flexSession).
export const LIVE_SCENARIOS = {
  full: {
    label: 'Full house',
    title: 'Packed Courts Open Play',
    ...BANILAD,
    courts: 3,
    players: pidRange(1, 24),
    late: { p19: 35, p23: 50, p24: 20 },
    elapsed: 105,
    len: 3,
    queue: 4,
    ready: true,
    fill: true,
    rest: 9,
    seed: 101,
    notes: 'Every slot is taken tonight. Be ready when your match is called.',
    finance: {
      courtFee: 350,
      entryFee: null,
      custom: true,
      payFee: 180,
      shuttles: [
        { itemId: 'inv1', tubes: 4 },
        { itemId: 'inv2', tubes: 2 },
      ],
    },
  },
  short: {
    label: 'Short on players',
    title: 'Small Group Doubles',
    ...LAHUG,
    courts: 3,
    players: pidRange(1, 8),
    away: ['p8'],
    elapsed: 45,
    len: 3,
    minimum: 6,
    queue: 1,
    seed: 202,
    notes: 'Open play for club regulars and guests.',
    finance: {
      courtFee: 250,
      entryFee: null,
      custom: true,
      payFee: 250,
      shuttles: [{ itemId: 'inv2', tubes: 2 }],
    },
  },
  over: {
    label: 'Players over the minimum',
    title: 'Marathon Doubles',
    ...TALAMBAN,
    courts: 2,
    players: pidRange(9, 22),
    late: { p21: 70, p22: 70 },
    elapsed: 170,
    len: 4,
    minimum: 4,
    queue: 2,
    fill: true,
    seed: 303,
    notes: 'Long night of doubles. Stay as long as you like.',
    finance: {
      courtFee: 300,
      entryFee: 80,
      custom: false,
      payFee: null,
      shuttles: [{ itemId: 'inv2', tubes: 4 }],
    },
  },
  courts: { label: 'Five-court booking example' },
  admission: { label: '36 to 37 admission example' },
}
export const isDemoLive = (x) => !!x.demo || /^(demo-live|flex)-/.test(x.id)
// The two flexibility examples: 36 sample players, either four courts with one more player waiting to be admitted,
// or five courts on different booking windows.
function flexSession(k) {
  const base = S.sessions.find((x) => x.id === 's-tonight') || S.sessions[0]
  const day = new Date()
  day.setHours(19, 30, 0, 0)
  const start = day.getTime()
  const end = start + 3 * 3600000
  const players = Array.from({ length: 37 }, (_, i) => {
    const id = `flex-${i + 1}`
    if (!S.players.some((p) => p.id === id))
      S.players.push({
        id,
        name: `Sample Player ${i + 1}`,
        identity: 'guest',
        sugg: 4,
        added: Date.now(),
      })
    return id
  })
  const id = `flex-${k}-${Date.now()}`
  const admission = k === 'admission'
  const courts = Array.from({ length: admission ? 4 : 5 }, (_, i) => ({
    id: `fc${i + 1}`,
    label: `Court ${i + 1}`,
    startsAt: start + (i >= 3 ? 3600000 : 0),
    until: i === 4 ? start + 2 * 3600000 : end,
  }))
  return {
    ...JSON.parse(JSON.stringify(base)),
    id,
    demo: k,
    title: admission ? '36 to 37 · admission example' : 'Five-court booking example',
    start,
    end,
    startedAt: start,
    status: 'active',
    courts,
    perCourt: 9,
    roster: players
      .slice(0, 36)
      .map((pid) => ({ pid, level: 4, present: true, locked: true, presentAt: start })),
    waitlist: admission ? [{ pid: players[36], level: 4, at: start }] : [],
    matches: [],
    seq: 0,
    requests: [],
    payments: {},
  }
}
export const buildLive = (k) =>
  LIVE_SCENARIOS[k].players ? simulateLive({ key: k, ...LIVE_SCENARIOS[k] }) : flexSession(k)
// Cancelled before it started: joiners, a waitlisted player and a payment mark stay on the record.
function cancelledExample() {
  const d = new Date()
  d.setDate(d.getDate() - 4)
  d.setHours(8, 0, 0, 0)
  const start = d.getTime(),
    lv = (pid) => (P(pid) || {}).sugg ?? 3
  const s = {
    id: 'x-cancel',
    title: 'Morning Doubles',
    start,
    end: start + 2 * 3600e3,
    ...TALAMBAN,
    courts: [
      { id: 'c1', label: 'Court 1' },
      { id: 'c2', label: 'Court 2' },
    ],
    singles: false,
    doubles: true,
    mode: 'fair',
    minimum: 0,
    minAuto: true,
    notes: 'Easy games before work. All levels welcome.',
    status: 'cancelled',
    download: 'none',
    roster: ['p2', 'p6', 'p10', 'p18', 'p23', 'p29'].map((pid, i) => ({
      pid,
      level: lv(pid),
      present: false,
      locked: false,
      presentAt: start - (60 - i * 5) * 3600e3,
    })),
    waitlist: [{ pid: 'p27', level: lv('p27'), at: start - 30 * 3600e3 }],
    requests: [],
    matches: [],
    seq: 0,
    published: null,
    cancelledAt: start - 14 * 3600e3,
    cancelReason: 'Not enough players',
    finance: {
      courtFee: 300,
      entryFee: 80,
      custom: true,
      payFee: 250,
      shuttles: [{ itemId: 'inv2', tubes: 2 }],
    },
    payments: { p2: { at: start - 40 * 3600e3, amount: 250 } },
  }
  s.minimum = sessionEstimate(s).low
  return s
}
// Upcoming: one full with a waitlist (tomorrow), one about 60% joined (in three days).
function upcomingExamples() {
  const at = (days, h) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(h, 0, 0, 0)
    return d.getTime()
  }
  const lv = (pid) => (P(pid) || {}).sugg ?? 3,
    now = Date.now()
  const join = (ids) =>
    ids.map((pid, i) => ({
      pid,
      level: lv(pid),
      present: false,
      locked: false,
      presentAt: now - (72 - i * 3) * 3600e3,
    }))
  const courts = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, label: `Court ${i + 1}` }))
  const prep = (o) => {
    const s = {
      singles: false,
      doubles: true,
      mode: 'fair',
      minAuto: true,
      status: 'prepared',
      download: 'none',
      matches: [],
      seq: 0,
      published: null,
      requests: [],
      waitlist: [],
      payments: {},
      ...o,
    }
    s.minimum = sessionEstimate(s).low
    return s
  }
  return [
    prep({
      id: 'x-next-full',
      title: 'Club Doubles Night',
      start: at(1, 18),
      end: at(1, 21),
      ...BANILAD,
      courts: courts(2),
      notes: 'Doubles all night. Slots are full; confirmed guests join the waitlist.',
      roster: join(pidRange(1, 16)),
      waitlist: ['p21', 'p22', 'p25', 'p26'].map((pid, i) => ({
        pid,
        level: lv(pid),
        at: now - (20 - i * 4) * 3600e3,
      })),
      payments: {
        p1: { at: now - 30 * 3600e3, amount: 200 },
        p2: { at: now - 26 * 3600e3, amount: 200 },
        p5: { at: now - 5 * 3600e3, amount: 200 },
      },
      finance: {
        courtFee: 350,
        entryFee: null,
        custom: true,
        payFee: 200,
        shuttles: [{ itemId: 'inv1', tubes: 3 }],
      },
    }),
    prep({
      id: 'x-next-partial',
      title: 'Beginners and Friends',
      start: at(3, 19),
      end: at(3, 21),
      ...LAHUG,
      courts: courts(3),
      notes: 'Relaxed games for newer players. Bring a friend.',
      roster: join([
        'p3',
        'p6',
        'p8',
        'p10',
        'p12',
        'p15',
        'p17',
        'p18',
        'p20',
        'p23',
        'p24',
        'p27',
        'p29',
        'p30',
      ]),
      finance: {
        courtFee: 250,
        entryFee: null,
        custom: false,
        payFee: null,
        shuttles: [{ itemId: 'inv2', tubes: 3 }],
      },
    }),
  ]
}
// Example sessions, versioned by S.histV: a bump replaces these ids in older saves and leaves everything else alone.
export function ensureHistory() {
  if (S.histV === 5) return
  // Older saves get the example players they're missing (levels already on the nine-step list by now).
  seedPlayers().forEach((p) => {
    if (!S.players.some((x) => x.id === p.id))
      S.players.push({ ...p, sugg: p.sugg == null ? p.sugg : oldToNewLevel(p.sugg) })
  })
  const ids = pidRange
  const specs = [
    {
      id: 'h1',
      title: 'Thursday Open Play',
      ago: 3,
      h: 19,
      len: 3,
      courts: 3,
      players: ids(1, 18),
      minimum: 6,
      status: 'finalized',
      published: true,
      seed: 11,
      invalidSeq: [14],
      unpaid: 3,
      finance: {
        courtFee: 350,
        entryFee: 60,
        custom: true,
        payFee: 700,
        shuttles: [
          { itemId: 'inv1', tubes: 4 },
          { itemId: 'inv2', tubes: 2 },
        ],
      },
      venue: 'Banilad Sports Hub',
      address: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
    },
    {
      id: 'h2',
      title: 'Sunday Night Queue',
      ago: 7,
      h: 18,
      len: 3,
      courts: 3,
      players: ids(1, 15),
      minimum: 7,
      status: 'finalized',
      published: false,
      seed: 22,
      finance: {
        courtFee: 350,
        entryFee: null,
        custom: false,
        payFee: null,
        shuttles: [{ itemId: 'inv2', tubes: 5 }],
      },
      venue: 'Banilad Sports Hub',
      address: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
    },
    {
      id: 'h3',
      title: 'Tuesday Drills',
      ago: 12,
      h: 19,
      len: 2,
      courts: 2,
      players: ids(3, 14),
      minimum: 4,
      status: 'invalid',
      seed: 33,
      venue: 'Lahug Covered Court',
      address: 'Salinas Dr, Lahug, Cebu City',
      reason:
        'The original device was lost before its records synced, so this session could not be recorded.',
    },
    // An ordinary night, a full house (24 of 24 slots), over budget (27 of 24) and few players for the courts.
    {
      id: 'x-ordinary',
      title: 'Open Play Night',
      ago: 2,
      h: 19,
      len: 3,
      courts: 3,
      players: ids(5, 22),
      minimum: 6,
      status: 'finalized',
      published: true,
      seed: 44,
      unpaid: 2,
      finance: {
        courtFee: 350,
        entryFee: null,
        custom: true,
        payFee: 200,
        shuttles: [
          { itemId: 'inv1', tubes: 3 },
          { itemId: 'inv2', tubes: 2 },
        ],
      },
      ...BANILAD,
    },
    {
      id: 'x-full',
      title: 'Lahug Smash Night',
      ago: 1,
      h: 19,
      len: 3,
      courts: 3,
      players: ids(1, 24),
      minimum: 4,
      status: 'finalized',
      published: true,
      seed: 55,
      finance: {
        courtFee: 250,
        entryFee: null,
        custom: false,
        payFee: null,
        shuttles: [{ itemId: 'inv2', tubes: 6 }],
      },
      ...LAHUG,
    },
    {
      id: 'x-over',
      title: 'Payday Open Play',
      ago: 5,
      h: 18,
      len: 3,
      courts: 3,
      players: ids(1, 27),
      minimum: 4,
      status: 'finalized',
      published: false,
      seed: 66,
      unpaid: 4,
      finance: {
        courtFee: 350,
        entryFee: 60,
        custom: true,
        payFee: 180,
        shuttles: [
          { itemId: 'inv1', tubes: 5 },
          { itemId: 'inv2', tubes: 2 },
        ],
      },
      ...BANILAD,
    },
    {
      id: 'x-few',
      title: 'Rainy Morning Doubles',
      ago: 3,
      h: 9,
      len: 3,
      courts: 3,
      players: ['p1', 'p3', 'p5', 'p7', 'p9', 'p11', 'p13', 'p16', 'p22', 'p28'],
      minimum: 3,
      minAuto: false,
      status: 'finalized',
      published: true,
      seed: 77,
      finance: {
        courtFee: 250,
        entryFee: null,
        custom: true,
        payFee: 200,
        shuttles: [{ itemId: 'inv2', tubes: 2 }],
      },
      ...LAHUG,
    },
  ]
  const built = specs.map(simulateHistory).concat(cancelledExample(), upcomingExamples())
  S.sessions = S.sessions.filter((x) => !built.some((b) => b.id === x.id)).concat(built)
  // One live example, unless something is already live (one session at a time).
  if (!S.sessions.some((x) => x.status === 'active')) S.sessions.push(buildLive('full'))
  S.histV = 5
  save()
}
