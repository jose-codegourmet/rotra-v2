// Captures createResultSnapshot and awardBaseline of packages/data/src/session-result/sessionResult.rules.ts by running the real
// functions over a seeded, generated grid of sessions (rosters with and without levels, every match format, invalid matches,
// substitutions with each credit choice, award histories around every threshold), for the Go port in internal/rules/sessionresult.
//
//   source ~/.nvm/nvm.sh && nvm use
//   node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-sessionresult.test.mjs
//
// Output: apps/api/internal/rules/sessionresult/testdata/snapshot.golden.json (commit it).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'
import { awardBaseline, createResultSnapshot } from '../../../../packages/data/src/session-result/sessionResult.rules.ts'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../internal/rules/sessionresult/testdata/snapshot.golden.json')

// A small seeded generator, so the grid is the same on every run.
let state = 20261120
const next = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return state / 2 ** 32
}
const int = (n) => Math.floor(next() * n)
const pick = (list) => list[int(list.length)]
const chance = (p) => next() < p

const LEVELS = ['beginner_low', 'beginner_mid', 'beginner_high', 'intermediate_low', 'intermediate_mid', 'intermediate_high', 'advanced_low', 'advanced_mid', 'advanced_high']
const NAMES = ['Zoe', 'amy', 'Ben', 'Élodie', 'Émile', 'al-Said', 'Jo Ann', 'JOANN', 'Dan', 'eve', 'Zoë', 'Mia', 'Noah', 'ana', 'Ana', 'Lee', 'Östen', 'Ines', 'Raj', 'Kai']
const FORMATS = { singles: [1, 1], doubles: [2, 2], fun_1v2: [1, 2], fun_3v3: [3, 3], fun_4v4: [4, 4], fun_5v5: [5, 5] }
const decision = (kind, winningTeam, a, b) => ({ kind, winningTeam, teamAScore: a, teamBScore: b, confirmedAt: 1 })

function session(n) {
  const sessionId = `s${n}`
  const size = 6 + int(10)
  const roster = Array.from({ length: size }, (_, i) => ({
    id: `e${n}-${i}`,
    sessionId,
    clubPlayerId: `c${n}-${i}`,
    nameSnapshot: chance(0.1) ? NAMES[int(NAMES.length)] : `${pick(NAMES)}${chance(0.3) ? ` ${i}` : ''}`,
    nicknameSnapshot: null,
    present: true,
    presentChangedAt: 0,
    level: chance(0.12) ? null : pick(LEVELS),
    levelLockedAt: 0,
    confirmedAt: 0,
  }))
  const ids = roster.map((r) => r.id)
  const matches = []
  const count = 3 + int(18)
  for (let i = 0; i < count; i++) {
    const format = n % 7 === 0 ? 'doubles' : pick(Object.keys(FORMATS))
    const [a, b] = FORMATS[format]
    if (a + b > ids.length) continue
    const pool = [...ids].sort(() => next() - 0.5)
    // A lineup may name a player the roster no longer holds (released): the awards then rate them at the default level.
    const teamA = pool.slice(0, a).map((id) => (chance(0.03) ? `gone-${id}` : id))
    const teamB = pool.slice(a, a + b)
    const invalid = chance(0.1)
    const winner = chance(0.5) ? 'A' : 'B'
    const substitutions = []
    if (!invalid && chance(0.25)) {
      const swapOut = pick(teamA)
      const incoming = pool[a + b] ?? `x${i}`
      teamA[teamA.indexOf(swapOut)] = incoming
      substitutions.push({ outId: swapOut, inId: incoming, team: 'A', at: i, creditTo: pick(['none', 'incoming', 'outgoing', undefined]) })
      if (chance(0.3) && teamB.length) {
        const out2 = pick(teamB)
        const in2 = pool[a + b + 1] ?? `y${i}`
        teamB[teamB.indexOf(out2)] = in2
        substitutions.push({ outId: out2, inId: in2, team: 'B', at: i + 1, creditTo: pick(['none', 'incoming', 'outgoing']) })
      }
    }
    for (const s of substitutions) if (s.creditTo === undefined) delete s.creditTo
    matches.push({
      id: `m${n}-${i}`,
      sessionId,
      matchNo: i + 1,
      state: invalid ? 'invalid' : chance(0.05) ? 'waiting' : 'completed',
      format,
      queuePosition: i + 1,
      origin: 'manual',
      manualProtected: false,
      teamA,
      teamB,
      courtIds: [],
      startedAt: 0,
      endedAt: 1,
      substitutions,
      decision: invalid ? decision('invalid', null, null, null) : chance(0.05) ? null : decision('completed', winner, null, null),
    })
  }
  // Award histories around the thresholds: 4 and 5 prior sessions, rates a hair either side of +0.15 and -0.30.
  const history = roster.flatMap((r) => {
    if (chance(0.15)) return []
    const prior = pick([0, 3, 4, 5, 5, 6, 9])
    const rate = chance(0.15) ? null : pick([0, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1, int(100) / 100, 1 / 3, 2 / 3])
    return [{ clubPlayerId: r.clubPlayerId, priorSessions: prior, baselineWinRate: rate }]
  })
  const players = roster.map((r) => ({ id: r.clubPlayerId, playerId: chance(0.5) ? `p-${r.clubPlayerId}` : null }))
  return { sessionId, roster, matches, history, players }
}

function baseline(n) {
  const clubPlayerIds = Array.from({ length: 4 }, (_, i) => `b${n}-${i}`)
  const sessions = Array.from({ length: 7 }, (_, i) => `bs${n}-${i}`)
  const priorSessions = []
  const priorFacts = []
  for (const club of clubPlayerIds)
    for (const sessionId of sessions) {
      if (chance(0.4)) continue
      priorSessions.push({ clubPlayerId: club, sessionId })
      for (let g = int(4); g > 0; g--) {
        priorFacts.push({ clubPlayerId: club, sessionId, fullParticipation: chance(0.8), team: pick(['A', 'B']), winningTeam: pick(['A', 'B']) })
      }
    }
  // Facts of sessions that are not the player's prior sessions, and of players nobody asked about, change nothing.
  priorFacts.push({ clubPlayerId: clubPlayerIds[0], sessionId: 'other', fullParticipation: true, team: 'A', winningTeam: 'A' })
  priorFacts.push({ clubPlayerId: 'nobody', sessionId: sessions[0], fullParticipation: true, team: 'A', winningTeam: 'A' })
  return { clubPlayerIds, priorSessions, priorFacts }
}

test('session result snapshots and baselines', () => {
  const snapshots = Array.from({ length: 140 }, (_, n) => {
    const input = session(n)
    const snapshot = createResultSnapshot({ ...input, generatedAt: 1_700_000_000_000 + n })
    return { ...input, generatedAt: 1_700_000_000_000 + n, out: JSON.parse(JSON.stringify(snapshot)) }
  })
  const baselines = Array.from({ length: 40 }, (_, n) => {
    const input = baseline(n)
    return { ...input, out: awardBaseline(input.clubPlayerIds, input.priorSessions, input.priorFacts) }
  })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify({ snapshots, baselines })}\n`)
})
