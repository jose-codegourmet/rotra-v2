import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { allPlayers, completeLineup, FORMAT_LABELS, matchStatus, shortName } from './match.rules'
import type { Match, MatchLineup, MatchOrigin } from './match.types'
import { balanceTeams, formatForSelection, generateMatches } from './queue.rules'
export function matchContext(s: MockState, sessionId: string) {
  return {
    roster: s.roster.filter((r) => r.sessionId === sessionId),
    matches: s.matches.filter((m) => m.sessionId === sessionId),
    courts: s.courts.filter((c) => c.sessionId === sessionId && !c.removedAt),
  }
}
export function requireLive(s: MockState, id: string) {
  const session = sessionIn(s, id)
  if (session.state !== 'active') throw new MockError('permission', 'Start the session first.')
  return session
}
function change<T>(sessionId: string, fn: (s: MockState) => { data: T; text: string }) {
  return queueMutation({ area: 'Queue', sessionId }, (s) => {
    requireLive(s, sessionId)
    return fn(s)
  })
}
function validate(s: MockState, id: string, lineup: MatchLineup, manual: boolean) {
  const session = sessionIn(s, id)
  if (
    !completeLineup(lineup) ||
    allPlayers(lineup).some(
      (id) => !s.roster.some((r) => r.id === id && r.sessionId === session.id),
    )
  )
    throw new MockError('permission', 'Fill every slot with a different roster player.')
  if (lineup.format === 'singles' && !session.allowSingles)
    throw new MockError('permission', 'singles is off for this session')
  if (lineup.format === 'doubles' && !session.allowDoubles)
    throw new MockError('permission', 'doubles is off for this session')
  if (!manual && lineup.format.startsWith('fun_'))
    throw new MockError('permission', 'Add a fun game manually instead.')
}
function append(
  s: MockState,
  id: string,
  lineup: MatchLineup,
  origin: MatchOrigin,
  protectedMatch: boolean,
  position?: number,
) {
  validate(s, id, lineup, origin === 'manual')
  const seq =
    Math.max(
      s.matchSequences[id] ?? 0,
      ...s.matches.filter((m) => m.sessionId === id).map((m) => m.matchNo),
    ) + 1
  s.matchSequences[id] = seq
  const match: Match = {
    ...structuredClone(lineup),
    id: crypto.randomUUID(),
    sessionId: id,
    matchNo: seq,
    state: 'waiting',
    queuePosition:
      position ??
      Math.max(0, ...s.matches.filter((m) => m.sessionId === id).map((m) => m.queuePosition)) + 1,
    origin,
    manualProtected: protectedMatch,
    courtIds: [],
    startedAt: null,
    endedAt: null,
    substitutions: [],
    decision: null,
  }
  s.matches.push(match)
  return match
}
function waiting(s: MockState, id: string, sessionId: string) {
  const match = s.matches.find(
    (m) => m.id === id && m.sessionId === sessionId && m.state === 'waiting',
  )
  if (!match) throw new MockError('permission', 'Only a waiting match can be changed.')
  return match
}
export function addMatch(input: MatchLineup & { sessionId: string }) {
  return change(input.sessionId, (s) => ({
    data: append(
      s,
      input.sessionId,
      { format: input.format, teamA: input.teamA, teamB: input.teamB },
      'manual',
      true,
    ),
    text: 'Match added to the queue',
  }))
}
export function makeMatch(input: { sessionId: string; selection: string[] }) {
  return change(input.sessionId, (s) => {
    const plan = formatForSelection(input.selection.length, sessionIn(s, input.sessionId))
    if (!plan.format) throw new MockError('permission', plan.reason)
    const selected = input.selection.map((id) =>
      s.roster.find((p) => p.id === id && p.sessionId === input.sessionId),
    )
    if (selected.some((p) => !p)) throw new MockError('permission', 'Player not available.')
    const lineup = balanceTeams(
        selected.filter((p): p is NonNullable<typeof p> => !!p),
        plan.format,
      ),
      data = append(s, input.sessionId, lineup, 'manual', true),
      position = s.matches.filter(
        (m) => m.sessionId === input.sessionId && m.state === 'waiting',
      ).length
    return { data, text: `${FORMAT_LABELS[plan.format]} added to the queue at #${position}` }
  })
}
export function updateMatchLineup(input: {
  sessionId: string
  matchId: string
  lineup: MatchLineup
}) {
  return change(input.sessionId, (s) => {
    const m = waiting(s, input.matchId, input.sessionId)
    validate(s, input.sessionId, input.lineup, true)
    m.format = input.lineup.format
    m.teamA = [...input.lineup.teamA]
    m.teamB = [...input.lineup.teamB]
    m.manualProtected = true
    m.origin = 'manual'
    return { data: m, text: 'Lineup saved · protected from regeneration' }
  })
}
export function addSuggestedMatch(input: {
  sessionId: string
  lineup: MatchLineup
  switched: boolean
}) {
  return change(input.sessionId, (s) => ({
    data: append(s, input.sessionId, input.lineup, 'suggested', input.switched),
    text: 'Suggestion added to the queue',
  }))
}
export function autoQueue(input: { sessionId: string; n: 2 | 3 | 4 | 6 }) {
  return change(input.sessionId, (s) => {
    if (![2, 3, 4, 6].includes(input.n))
      throw new MockError('permission', 'Choose 2, 3, 4 or 6 matches.')
    const result = generateMatches(
      sessionIn(s, input.sessionId),
      s.roster,
      s.matches,
      input.n,
      Math.random,
    )
    if (result.error) throw new MockError('permission', result.error)
    const matches = result.matches.map((m) => append(s, input.sessionId, m, 'auto', false))
    return { data: matches, text: `${matches.length} matches added to the queue` }
  })
}
export function regenerateQueue(sessionId: string) {
  return change(sessionId, (s) => {
    const ctx = matchContext(s, sessionId),
      replace = ctx.matches
        .filter(
          (m) =>
            m.state === 'waiting' &&
            (!m.manualProtected || matchStatus(m, ctx).kind === 'needs-attention'),
        )
        .sort((a, b) => a.queuePosition - b.queuePosition)
    if (!replace.length)
      throw new MockError('permission', 'There are no waiting matches to rebuild.')
    s.matches = s.matches.filter((m) => !replace.some((r) => r.id === m.id))
    const result = generateMatches(
      sessionIn(s, sessionId),
      ctx.roster,
      s.matches,
      replace.length,
      Math.random,
    )
    if (result.error) throw new MockError('permission', result.error)
    const matches = result.matches.map((lineup, i) =>
      append(s, sessionId, lineup, 'auto', false, replace[i]?.queuePosition),
    )
    return { data: matches, text: `Queue regenerated · ${matches.length} rebuilt` }
  })
}
export function moveMatch(input: {
  sessionId: string
  matchId: string
  toIndex: number
  method?: 'arrow' | 'drop'
}) {
  return change(input.sessionId, (s) => {
    const m = waiting(s, input.matchId, input.sessionId),
      list = s.matches
        .filter((m) => m.sessionId === input.sessionId && m.state === 'waiting')
        .sort((a, b) => a.queuePosition - b.queuePosition),
      from = list.indexOf(m),
      to = Math.max(0, Math.min(list.length - 1, Math.trunc(input.toIndex)))
    if (!Number.isFinite(to)) throw new MockError('permission', 'Choose a queue position.')
    list.splice(from, 1)
    list.splice(to, 0, m)
    list.forEach((m, i) => {
      m.queuePosition = i + 1
    })
    return {
      data: null,
      text:
        input.method === 'arrow' || (input.method === undefined && Math.abs(to - from) === 1)
          ? 'Queue order changed'
          : `Match ${m.matchNo} moved to #${to + 1}`,
    }
  })
}
export function removeWaitingMatch(input: { sessionId: string; matchId: string }) {
  return change(input.sessionId, (s) => {
    const m = waiting(s, input.matchId, input.sessionId)
    s.matches = s.matches.filter((x) => x.id !== m.id)
    return { data: null, text: `Waiting match ${m.matchNo} removed` }
  })
}
export function swapPlayers(input: { sessionId: string; matchId: string; a: string; b: string }) {
  return change(input.sessionId, (s) => {
    const m = waiting(s, input.matchId, input.sessionId),
      a = m.teamA.includes(input.a) ? input.a : input.b,
      b = m.teamB.includes(input.b) ? input.b : input.a
    if (a === b || !m.teamA.includes(a) || !m.teamB.includes(b))
      throw new MockError('permission', 'Choose one player from each team.')
    const pa = s.roster.find((p) => p.id === input.a),
      pb = s.roster.find((p) => p.id === input.b)
    if (!pa || !pb) throw new MockError('permission', 'Player not available.')
    m.teamA = m.teamA.map((id) => (id === a ? b : id))
    m.teamB = m.teamB.map((id) => (id === b ? a : id))
    validate(s, input.sessionId, m, true)
    m.origin = 'manual'
    m.manualProtected = true
    return {
      data: null,
      text: `Match ${m.matchNo}: ${shortName(pa)} and ${shortName(pb)} switched sides · protected from regeneration`,
    }
  })
}
