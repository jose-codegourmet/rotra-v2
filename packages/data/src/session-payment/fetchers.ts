import { formatPeso } from '@rotra/schema/money'
import { getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, requireClubAccess, sessionIn } from '../mock/transaction'
import { sessionCostIn } from '../session-cost/fetchers'
import { amountDuePerHead, paymentTotals } from '../session-cost/sessionCost.rules'

export async function getSessionPayments(sessionId: string) {
  await delay()
  const state = readMockState(), session = sessionIn(state, sessionId)
  if (session.state === 'invalid') return null
  const cost = sessionCostIn(state, sessionId), estimate = cost?.estimate ?? null
  const roster = state.roster.filter((p) => p.sessionId === sessionId)
  const marks = state.paymentMarks.filter((m) => m.sessionId === sessionId && roster.some((p) => p.id === m.sessionPlayerId))
  const players = roster.map((p) => {
    const mark = marks.find((m) => m.sessionPlayerId === p.id)
    const clubPlayer = state.clubPlayers.find((c) => c.id === p.clubPlayerId)
    return { sessionPlayerId: p.id, clubPlayerId: p.clubPlayerId, name: p.nameSnapshot, picture: state.players.find((player) => player.id === clubPlayer?.playerId)?.picture, paid: mark ? { amount: mark.amountMinor, at: mark.markedAt } : undefined }
  }).sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
  const amountDue = amountDuePerHead(estimate)
  return { players, amountDue, dueBasis: cost?.saved.paymentMode ?? 'break_even', entranceFeeIncluded: estimate?.entranceFeePerHead, totals: paymentTotals({ marks, total: roster.length, amountDue, cost: estimate?.total ?? null }) }
}
function requirePaymentsWrite(state: MockState, sessionId: string) {
  const session = sessionIn(state, sessionId)
  if (session.state === 'invalid' || session.state === 'finalizing') throw new MockError('permission', 'Payments are not available for this session.')
  if (getMockDevState().licenseExpired && session.state !== 'active') requireClubAccess()
  if (getMockDevState().offline && state.downloads[sessionId] !== 'ready') throw new MockError('offline', 'No downloaded copy on this device. Connect, or download first.')
}
export function togglePaid({ sessionId, clubPlayerId }: { sessionId: string; clubPlayerId: string }) {
  return queueMutation({ area: 'Payments' }, (state) => {
    requirePaymentsWrite(state, sessionId)
    const player = state.roster.find((p) => p.sessionId === sessionId && p.clubPlayerId === clubPlayerId)
    if (!player) throw new MockError('permission', 'Player not in this session.')
    const mark = state.paymentMarks.find((m) => m.sessionId === sessionId && m.sessionPlayerId === player.id)
    if (mark) {
      state.paymentMarks = state.paymentMarks.filter((m) => m !== mark)
      return { data: { paid: false }, text: `${player.nameSnapshot} marked not paid` }
    }
    const amount = sessionCostIn(state, sessionId)?.estimate.perHead ?? 0
    state.paymentMarks.push({ sessionId, sessionPlayerId: player.id, amountMinor: amount, currency: 'PHP', markedAt: Date.now() })
    return { data: { paid: true }, text: `${player.nameSnapshot} paid ${formatPeso(amount)}` }
  })
}
export function markAllPaid(sessionId: string) {
  return queueMutation({ area: 'Payments' }, (state) => {
    requirePaymentsWrite(state, sessionId)
    const amount = sessionCostIn(state, sessionId)?.estimate.perHead ?? 0
    let count = 0
    for (const p of state.roster.filter((p) => p.sessionId === sessionId)) {
      if (state.paymentMarks.some((m) => m.sessionId === sessionId && m.sessionPlayerId === p.id)) continue
      state.paymentMarks.push({ sessionId, sessionPlayerId: p.id, amountMinor: amount, currency: 'PHP', markedAt: Date.now() })
      count++
    }
    return { data: { count }, text: `${count} players marked paid` }
  })
}
