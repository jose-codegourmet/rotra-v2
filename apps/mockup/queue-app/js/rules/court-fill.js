import {
  all,
  busyOf,
  busyText,
  courtFill,
  courtMatches,
  courtOpen,
  courtsNeeded,
  courtsOf,
  freeCourts,
  listNames,
  R,
  waiting,
} from '../helpers.js'
import { FORMATS } from '../state.js'

export function blockOf(s, m) {
  const [a, b] = FORMATS[m.format]
  if (m.teamA.length !== a || m.teamB.length !== b)
    return { kind: 'attention', text: 'Lineup is incomplete' }
  const absent = all(m).filter((p) => !R(s, p) || !R(s, p).present)
  if (absent.length)
    return {
      kind: 'attention',
      text: `${listNames(absent)} ${absent.length > 1 ? 'are' : 'is'} not present`,
    }
  const busy = all(m).filter((p) => busyOf(s, p, m))
  if (busy.length)
    return {
      kind: 'blocked',
      text: `${listNames(busy)} ${busy.length > 1 ? 'are' : 'is'} ${busyText(s, busyOf(s, busy[0], m))}`,
    }
  if (m.status === 'oncourt') return null
  if (freeCourts(s).length < courtsNeeded(m))
    return {
      kind: 'courts',
      text: courtsNeeded(m) === 2 ? 'Needs two free courts' : 'Waiting for a free court',
    }
  return null
}
// Put a match On court: it holds the court(s) but doesn't start. The minutes timer starts at Start match.
export function placeMatch(m, courts) {
  m.status = 'oncourt'
  m.courts = courts.slice()
  m.placedAt = Date.now()
  delete m.startedAt
}
// Auto Queue: free courts get the next ready match, placed On court. It never starts a match.
// Skips 5v5 (placed by hand on two courts) and courts not open yet. A court past its booking end still fills: the end is a reminder.
export function autoFill(s, { except = null, only = null } = {}) {
  if (s.status !== 'active' || courtFill(s) !== 'auto') return []
  const placed = []
  s.courts.forEach((c) => {
    if (only && !only.includes(c.id)) return
    if (!courtOpen(s, c) || courtMatches(s).some((m) => m.courts.includes(c.id))) return
    const next = waiting(s).find((m) => m.id !== except && courtsNeeded(m) === 1 && !blockOf(s, m))
    if (!next) return
    placeMatch(next, [c.id])
    placed.push(next)
  })
  return placed
}
// Swap an On court match with the queue: the next waiting match that needs the same number of courts and would be
// ready once this match's players are freed. The match on court takes that match's place in the queue.
export function swapCandidate(s, m) {
  if (!m || m.status !== 'oncourt') return null
  m.status = 'swapping'
  const next = waiting(s).find((x) => courtsNeeded(x) === courtsNeeded(m) && !blockOf(s, x))
  m.status = 'oncourt'
  return next || null
}
export const autoNote = (s, placed) =>
  placed.map((m) => ` · Match ${m.seq} on ${courtsOf(s, m)} · getting ready`).join('')
export const attention = (s) => waiting(s).filter((m) => (blockOf(s, m) || {}).kind === 'attention')
