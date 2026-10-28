import { required } from '../mock/required'
import type { PlayerGame, PlayerSessionRecord } from '../player/player.types'

export const PLAYER_FIXTURE_NOW = new Date('2026-10-27T12:00:00+08:00')
export function daysAgo(days: number): string {
  return new Date(PLAYER_FIXTURE_NOW.getTime() - days * 86400000).toISOString()
}
let gameSequence = 0
function game(
  format: PlayerGame['format'],
  partners: string[],
  opponents: string[],
  result: PlayerGame['result'],
  score: string | null,
  counting: PlayerGame['counting'] = 'counted',
  note = '',
): PlayerGame {
  return {
    id: `recorded-game-${gameSequence++}`,
    format,
    partners,
    opponents,
    result,
    score,
    counting,
    note,
  }
}
// These historical sessions have no corresponding Queue fixture. Preserve their games with no link.
export const JOSE_SESSIONS: PlayerSessionRecord[] = [
  {
    id: 'm1',
    title: 'Sunday Night Queue',
    clubName: 'Lahug Smash Club',
    finishedAt: daysAgo(1),
    sessionPageUrl: null,
    games: [
      game('doubles', ['Aaron'], ['Gab', 'Mikee Abellana'], 'won', '21–18'),
      game('doubles', ['Dalton'], ['Karl', 'Jasper'], 'lost', null),
      game('singles', [], ['Albion'], 'won', '21–15'),
      game('fun_3v3', ['Raymark', 'Vince'], ['Emji', 'Derrick', 'Andrew'], 'won', '21–12', 'fun'),
    ],
  },
  {
    id: 'm2',
    title: 'Thursday Open Play',
    clubName: 'Lahug Smash Club',
    finishedAt: daysAgo(4),
    sessionPageUrl: null,
    games: [
      game('doubles', ['Karl'], ['Santino', 'Aaron'], 'won', '21–19'),
      game('doubles', ['Mikee Abellana'], ['Gab', 'Dalton'], 'lost', '17–21'),
      game('doubles', ['Jasper'], ['Raymark', 'Derrick'], 'won', null),
    ],
  },
  {
    id: 'm3',
    title: 'Friday Night Smash',
    clubName: 'IT Park Badminton Club',
    finishedAt: daysAgo(18),
    sessionPageUrl: null,
    games: [
      game('doubles', ['Neil'], ['Klent', 'Tricia'], 'won', '21–16'),
      game('singles', [], ['Chase'], 'lost', '19–21'),
      game(
        'doubles',
        ['Derrick'],
        ['Mark', 'Lalai'],
        'lost',
        null,
        'partial',
        'Came in mid-game for Troy',
      ),
      game('doubles', ['Troy'], ['Dian Tan', 'Ezzy'], 'won', '21–14'),
    ],
  },
  {
    id: 'm4',
    title: 'Sunday Night Queue',
    clubName: 'Lahug Smash Club',
    finishedAt: daysAgo(29),
    sessionPageUrl: null,
    games: [
      game('doubles', ['Aaron'], ['Emji', 'Santino'], 'lost', '15–21'),
      game('doubles', ['Gab'], ['Mikee Abellana', 'Albion'], 'won', '21–17'),
      game('singles', [], ['Dalton'], 'won', null),
    ],
  },
  {
    id: 'm5',
    title: 'Thursday Open Play',
    clubName: 'Lahug Smash Club',
    finishedAt: daysAgo(46),
    sessionPageUrl: null,
    games: [
      game('doubles', ['Vince'], ['Karl', 'Jasper'], 'won', '21–11'),
      game('doubles', ['Mikee Abellana'], ['Aaron', 'Dalton'], 'lost', '20–22'),
    ],
  },
]

/** The demo player pool, for generated partners and opponents. */
const NAMES = [
  'Gretchen',
  'Jess',
  'Natnat',
  'Camill',
  'Ley',
  'Dhin',
  'Joeriz',
  'Trixie',
  'Sam',
  'Robert',
  'Maria Steph',
  'Andrew',
  'Jay',
  'Iovanni',
  'Troy',
  'Klod',
  'Derrick',
  'Neil',
  'Jose',
  'Mark',
  'Tracy',
  'Tirby',
  'Lalai',
  'Mikee Abellana',
  'Dexter',
  'Dalton',
  'Albion',
  'Vince',
  'Jasper',
  'Santino',
  'Aaron',
  'Raymark',
  'Gab',
  'CJ',
  'Emman',
  'Nathan',
  'Karl',
  'Russel',
  'Rhyco',
  'Emji',
  'Anton',
  'Edrian',
  'Ezzy',
  'Klent',
  'Chase',
  'David',
  'Shadow',
  'Dexter Opalla',
  'Dian Tan',
  'Tricia',
  'PJ Perez',
]
const CLUBS = [
  ['Lahug Smash Club', ['Sunday Night Queue', 'Thursday Open Play']],
  ['IT Park Badminton Club', ['Friday Night Smash', 'Lunch Break Doubles']],
  ['Mandaue Shuttle Society', ['Saturday Morning Rally']],
  ['Talamban Racket Club', ['Wednesday Ladder Night']],
] as const

function hashStr(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
/** Deterministic port of the prototype's genSessions; no numeric rating is calculated. */
export function genSessions(seed: string, counted: number): PlayerSessionRecord[] {
  const h0 = hashStr(seed)
  const pick = (key: string) => required(NAMES[hashStr(seed + key) % NAMES.length])
  const out: PlayerSessionRecord[] = []
  let left = counted,
    n = 0,
    ago = 1 + (h0 % 5)
  while (left > 0) {
    const [clubName, titles] = required(CLUBS[(h0 >>> (n % 8)) % CLUBS.length])
    const games: PlayerGame[] = []
    const take = Math.min(left, 2 + ((h0 >>> n) % 3))
    for (let g = 0; g < take; g++) {
      const h = hashStr(`${seed}-${n}-${g}`),
        single = h % 6 === 0,
        won = (h >>> 3) % 5 < 3
      const b = 9 + ((h >>> 7) % 11)
      games.push({
        ...game(
          single ? 'singles' : 'doubles',
          single ? [] : [pick(`p${n}${g}`)],
          single ? [pick(`o${n}${g}`)] : [pick(`o${n}${g}`), pick(`q${n}${g}`)],
          won ? 'won' : 'lost',
          (h >>> 9) % 3 === 0 ? null : won ? `21–${b}` : `${b}–21`,
        ),
        id: `${seed}-${n}-${g}`,
      })
    }
    if (n === 0)
      games.push({
        ...game(
          'fun_4v4',
          [pick('f1'), pick('f2'), pick('f3')],
          [pick('f4'), pick('f5'), pick('f6'), pick('f7')],
          'lost',
          '18–21',
          'fun',
        ),
        id: `${seed}-fun`,
      })
    out.push({
      id: `${seed}-s${n}`,
      title: required(titles[(h0 >>> n) % titles.length]),
      clubName,
      finishedAt: daysAgo(ago),
      sessionPageUrl: null,
      games,
    })
    left -= take
    n++
    ago += 2 + ((h0 >>> (n + 2)) % 6)
  }
  return out
}

export function joseSession(index: number): PlayerSessionRecord {
  return required(JOSE_SESSIONS[index])
}
export function joseGame(session: number, index: number): PlayerGame {
  return required(joseSession(session).games[index])
}
