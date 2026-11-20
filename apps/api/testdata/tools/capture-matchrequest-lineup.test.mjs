// Captures requestLineup of packages/data/src/match-request/matchRequest.rules.ts (no Vitest case pins it) by running the real
// function over a grid of rosters, matches and requests, for the Go port in internal/rules/matchrequest.
//
//   source ~/.nvm/nvm.sh && nvm use
//   node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-matchrequest-lineup.test.mjs
//
// Output: apps/api/internal/rules/matchrequest/testdata/lineup.golden.json (commit it).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'
import {
  FORMAT_NOT_ALLOWED_TEXT,
  NO_MATCH_REQUESTS_TEXT,
  allowedRequestFormats,
  notEnoughToFillText,
  requestLineup,
  requestSpots,
} from '../../../../packages/data/src/match-request/matchRequest.rules.ts'
import { FORMAT_LABELS } from '../../../../packages/data/src/match/match.rules.ts'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../internal/rules/matchrequest/testdata/lineup.golden.json')

// The spots a request holds never exceed what its format needs (the service refuses more), so each shape is cut to fit.
const SIZES = { singles: [1, 1], doubles: [2, 2], fun_1v2: [1, 2], fun_3v3: [3, 3], fun_4v4: [4, 4], fun_5v5: [5, 5] }
const FORMATS = ['singles', 'doubles', 'fun_1v2', 'fun_3v3', 'fun_4v4', 'fun_5v5']
const ids = (n) => Array.from({ length: n }, (_, i) => `p${i}`)
const done = (a, b) => ({ state: 'completed', teamA: a, teamB: b })
const wait = (a, b) => ({ state: 'waiting', teamA: a, teamB: b })
// Each fixture: the roster (id, present, games adjustment) and the matches.
const FIXTURES = {
  all_present: { roster: ids(10).map((id) => ({ id, present: true, adj: null })), matches: [] },
  games_differ: {
    roster: ids(10).map((id, i) => ({ id, present: true, adj: i === 3 ? 2 : i === 5 ? -1 : null })),
    matches: [done(['p1', 'p2'], ['p3', 'p4']), done(['p1', 'p6'], ['p2', 'p7']), done(['p8'], ['p9']), wait(['p5', 'p6'], ['p7', 'p8'])],
  },
  some_away: {
    roster: ids(10).map((id, i) => ({ id, present: ![4, 5, 6].includes(i), adj: null })),
    matches: [wait(['p7', 'p8'], ['p9', 'p1']), wait(['p7'], ['p2'])],
  },
  three_present: { roster: ids(6).map((id, i) => ({ id, present: i < 3, adj: null })), matches: [] },
  ties_keep_roster_order: { roster: ids(9).map((id) => ({ id, present: true, adj: 0 })), matches: [done(['p5'], ['p6'])] },
}
const SPOTS = {
  anyone: { partners: [], opponents: [] },
  nulls: { partners: [null, null, null, null], opponents: [null, null, null, null, null] },
  one_partner: { partners: ['p1'], opponents: [] },
  partner_and_opponent: { partners: ['p2'], opponents: ['p3'] },
  partner_nulls_and_opponents: { partners: [null, 'p4', null], opponents: [null, 'p7'] },
  two_opponents: { partners: [], opponents: ['p8', 'p9'] },
  named_away_player: { partners: ['p5'], opponents: [] },
  all_named_small: { partners: ['p1'], opponents: ['p2'] },
  many_named: { partners: ['p1', 'p2', 'p3', 'p4'], opponents: ['p5', 'p6', 'p7', 'p8', 'p9'] },
}

test('lineup', () => {
  const lineups = []
  for (const [fixture, f] of Object.entries(FIXTURES))
    for (const [spots, s] of Object.entries(SPOTS))
      for (const format of FORMATS) {
        const roster = f.roster.map((r) => ({ id: r.id, present: r.present, gamesAdjustment: r.adj }))
        const matches = f.matches.map((m, i) => ({ id: `m${i}`, substitutions: [], ...m }))
        const [na, nb] = SIZES[format]
        const partners = s.partners.slice(0, na - 1)
        const opponents = s.opponents.slice(0, nb)
        const result = requestLineup({ pid: 'p0', format, partners, opponents }, { roster, matches })
        lineups.push({ fixture, spots, format, roster: f.roster, matches: f.matches, partners, opponents, out: result })
      }
  const spots = FORMATS.map((format) => ({ format, out: requestSpots(format) }))
  const labels = FORMATS.map((format) => ({ format, text: notEnoughToFillText(FORMAT_LABELS[format]) }))
  const allowed = []
  for (const allowSingles of [true, false])
    for (const allowDoubles of [true, false])
      for (const requestFormats of [undefined, { doubles: true, singles: false, fun_1v2: true, fun_3v3: false, fun_4v4: true, fun_5v5: false }, { doubles: false, singles: false, fun_1v2: false, fun_3v3: false, fun_4v4: false, fun_5v5: false }])
        allowed.push({ allowSingles, allowDoubles, requestFormats: requestFormats ?? null, out: allowedRequestFormats({ allowSingles, allowDoubles, requestFormats }) })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify({ lineups, spots, labels, allowed, texts: { none: NO_MATCH_REQUESTS_TEXT, format: FORMAT_NOT_ALLOWED_TEXT } }, null, 1)}\n`)
})
