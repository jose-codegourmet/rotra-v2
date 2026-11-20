// Captures the queue generation of packages/data/src/match/{queue,autoQueue}.rules.ts (seededRng's draws, formatForSelection,
// balanceTeams, generateMatches, autoQueueDraftConflict) by running the real functions over a grid, for the Go port in
// internal/queuewrites/queuegen. Generation is TypeScript-only (bucket 3 of the rule-cases track: the device will make the
// lineups, BL-3), so the Go copy lives next to the writes, not under internal/rules. The server still generates from `n`.
//
//   source ~/.nvm/nvm.sh && nvm use
//   node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-queuegen.test.mjs
//
// seededRng is not exported: its text is cut out of match-queue.ts and its first draws are pinned beside the lineups they make.
// Output: apps/api/internal/queuewrites/queuegen/testdata/generation.golden.json (commit it).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'
import {
  AUTO_QUEUE_MODES,
  autoQueueDraftConflict,
} from '../../../../packages/data/src/match/autoQueue.rules.ts'
import {
  balanceTeams,
  formatForSelection,
  generateMatches,
} from '../../../../packages/data/src/match/queue.rules.ts'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../internal/queuewrites/queuegen/testdata/generation.golden.json')

const LEVELS = [
  'beginner_low', 'beginner_mid', 'beginner_high', 'intermediate_low', 'intermediate_mid', 'intermediate_high',
  'advanced_low', 'advanced_mid', 'advanced_high',
]
// A player: id, present, level code (null is none), games adjustment (null is none), names.
const player = (n, present, level, adj = null, nick = null, club = null) => ({
  id: `p${n}`, sessionId: 's', clubPlayerId: `c${n}`, nameSnapshot: `Player ${n} Surname`, nicknameSnapshot: nick, clubNickname: club,
  present, level, gamesAdjustment: adj,
})
const mk = (levelOf, presentOf = () => true, adjOf = () => null) =>
  Array.from({ length: 10 }, (_, i) => player(i, presentOf(i), levelOf(i), adjOf(i)))
const done = (a, b) => ({ id: `m${a[0]}${b[0]}`, sessionId: 's', state: 'completed', teamA: a, teamB: b, substitutions: [], decision: { kind: 'completed' } })
const wait = (a, b) => ({ id: `m${a[0]}${b[0]}`, sessionId: 's', state: 'waiting', teamA: a, teamB: b, substitutions: [] })
const live = (a, b) => ({ id: `m${a[0]}${b[0]}`, sessionId: 's', state: 'active', teamA: a, teamB: b, substitutions: [] })
const ROSTERS = {
  same_level: mk(() => 'intermediate_low'),
  mixed_levels: mk((i) => LEVELS[(i * 4) % 9]),
  some_unleveled: mk((i) => (i % 3 === 0 ? null : LEVELS[i % 9])),
  some_away: mk((i) => LEVELS[i % 9], (i) => ![2, 5, 7].includes(i)),
  three_present: mk((i) => LEVELS[i % 9], (i) => i < 3),
  adjusted: mk((i) => LEVELS[(i * 2) % 9], () => true, (i) => (i === 1 ? 3 : i === 4 ? -2 : null)),
}
const MATCHES = {
  none: [],
  some_played: [done(['p0', 'p1'], ['p2', 'p3']), done(['p0'], ['p4']), done(['p5', 'p6'], ['p7', 'p8'])],
  some_waiting: [wait(['p0', 'p1'], ['p2', 'p3']), wait(['p4'], ['p5']), live(['p6', 'p7'], ['p8', 'p9'])],
}
const SESSIONS = []
for (const mode of ['hard', 'fair', 'chill'])
  for (const [s, d] of [[true, true], [true, false], [false, true], [false, false]])
    SESSIONS.push({ id: 's', sessionMode: mode, allowSingles: s, allowDoubles: d })
const SEEDS = ['a', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '', 'é日本', '😀x', 'seed with spaces']

test('generation', () => {
  const generate = []
  for (const session of SESSIONS)
    for (const [rosterName, roster] of Object.entries(ROSTERS))
      for (const [matchesName, matches] of Object.entries(MATCHES))
        for (const n of [1, 2, 3, 4, 6]) {
          // Every seed on the first roster and a smaller set elsewhere, to keep the file readable.
          const seeds = rosterName === 'mixed_levels' && matchesName === 'some_played' ? SEEDS : SEEDS.slice(0, 2)
          for (const seed of seeds) {
            generate.push({
              session, roster: rosterName, matches: matchesName, n, seed,
              out: generateMatches(session, roster, matches, n, seededOf(seed)),
            })
          }
        }

  const draws = SEEDS.map((seed) => {
    const rng = seededOf(seed)
    return { seed, out: Array.from({ length: 12 }, () => rng()) }
  })

  const formats = []
  for (const [s, d] of [[true, true], [true, false], [false, true], [false, false]])
    for (let count = 0; count <= 12; count++)
      formats.push({ allowSingles: s, allowDoubles: d, count, out: formatForSelection(count, { allowSingles: s, allowDoubles: d }) })

  const balance = []
  const FORMATS = { singles: 2, fun_1v2: 3, doubles: 4, fun_3v3: 6, fun_4v4: 8, fun_5v5: 10 }
  for (const [rosterName, roster] of Object.entries(ROSTERS))
    for (const [format, size] of Object.entries(FORMATS))
      for (const shift of [0, 3]) {
        // The selection in pick order, rotated so the picks do not always start with the first player.
        const picks = Array.from({ length: size }, (_, i) => roster[(i + shift) % roster.length])
        balance.push({ roster: rosterName, format, shift, out: balanceTeams(picks, format) })
      }

  const conflicts = []
  const session = { id: 's', allowSingles: true, allowDoubles: true }
  const lineups = {
    ok_singles: { format: 'singles', teamA: ['p0'], teamB: ['p1'] },
    ok_doubles: { format: 'doubles', teamA: ['p0', 'p1'], teamB: ['p2', 'p3'] },
    incomplete: { format: 'doubles', teamA: ['p0', 'p1'], teamB: ['p2'] },
    repeats: { format: 'doubles', teamA: ['p0', 'p1'], teamB: ['p1', 'p3'] },
    fun: { format: 'fun_3v3', teamA: ['p0', 'p1', 'p2'], teamB: ['p3', 'p4', 'p5'] },
    away: { format: 'doubles', teamA: ['p0', 'p1'], teamB: ['p2', 'p5'] },
    stranger: { format: 'singles', teamA: ['p0'], teamB: ['nobody'] },
    busy: { format: 'doubles', teamA: ['p6', 'p1'], teamB: ['p2', 'p3'] },
    unleveled_away: { format: 'singles', teamA: ['p0'], teamB: ['p3'] },
  }
  for (const [sess, s] of Object.entries({ both: session, no_singles: { ...session, allowSingles: false }, no_doubles: { ...session, allowDoubles: false } }))
    for (const [lineup, l] of Object.entries(lineups))
      for (const mode of AUTO_QUEUE_MODES)
        for (const [rosterName, matches] of [['same_level', 'none'], ['some_away', 'none'], ['mixed_levels', 'some_waiting'], ['some_unleveled', 'some_waiting']]) {
          // A nickname on some players, so the refusal names the Queue Master's name.
          const roster = ROSTERS[rosterName].map((p, i) => (i === 2 ? { ...p, clubNickname: '  Club Two  ' } : i === 3 ? { ...p, nicknameSnapshot: 'Nick' } : p))
          conflicts.push({
            session: sess, lineup, mode, roster: rosterName, matches,
            clubNicknames: { p2: '  Club Two  ' },
            out: autoQueueDraftConflict({ ...l, id: 'd', mode, reason: '', fingerprint: '' }, s, { roster, matches: MATCHES[matches], courts: [] }),
          })
        }

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(
    out,
    `${JSON.stringify({ rosters: ROSTERS, matches: MATCHES, draws, generate, formats, balance, conflicts, modes: AUTO_QUEUE_MODES })}\n`,
  )
})

// seededRng of match-queue.ts is not exported and that file needs the database client, so its text is cut out of the source and run:
// the Go port is checked against the real function, not a copy of it.
function seededOf(seed) {
  const source = readFileSync(resolve(here, '../../../../packages/db/src/queue/match-queue.ts'), 'utf8')
  const found = /function seededRng\(seed: string\) \{[\s\S]*?\n\}\n/.exec(source)
  if (!found) throw new Error('seededRng not found in match-queue.ts')
  return new Function(`${found[0].replace('(seed: string)', '(seed)')}\nreturn seededRng`)()(seed)
}
