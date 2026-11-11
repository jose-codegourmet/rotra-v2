import { formatPeso } from '@rotra/schema/money'
import { getConnectivity } from '../connectivity/connectivity'
import portraits from '../fixtures/playerPortraits.json'
import { getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, requireClubAccess, sessionIn } from '../mock/transaction'
import {
  realGetSessionPayments,
  realMarkAllPaid,
  realSetPaymentAmount,
  realSetPaymentMarks,
  realTogglePaid,
} from '../real/financials'
import { isRealDataMode } from '../real/mode'
import { sessionCostIn } from '../session-cost/fetchers'
import { amountDuePerHead } from '../session-cost/sessionCost.rules'
import type { SessionCostInput } from '../session-cost/sessionCost.types'
import { paymentStatus, paymentTotals } from './sessionPayment.rules'
import type { SetPaymentAmountInput, SetPaymentMarksInput } from './sessionPayment.types'

/** Uploaded pictures by global player id (registered and unclaimed players only). */
const pictures: Record<string, string> = portraits

export async function getSessionPayments(sessionId: string) {
  if (isRealDataMode()) return realGetSessionPayments(sessionId)
  await delay()
  const state = readMockState(),
    session = sessionIn(state, sessionId)
  if (session.state === 'invalid') return null
  const cost = sessionCostIn(state, sessionId),
    estimate = cost?.estimate ?? null
  const roster = state.roster.filter((p) => p.sessionId === sessionId)
  const marks = state.paymentMarks.filter(
    (m) => m.sessionId === sessionId && roster.some((p) => p.id === m.sessionPlayerId),
  )
  const amountDue = amountDuePerHead(estimate)
  const players = roster
    .map((p) => {
      const mark = marks.find((m) => m.sessionPlayerId === p.id)
      const clubPlayer = state.clubPlayers.find((c) => c.id === p.clubPlayerId)
      return {
        sessionPlayerId: p.id,
        clubPlayerId: p.clubPlayerId,
        name: p.nameSnapshot,
        picture: clubPlayer?.playerId ? pictures[clubPlayer.playerId] : undefined,
        paid: mark ? { amount: mark.amountMinor, at: mark.markedAt } : undefined,
        status: paymentStatus(mark, amountDue),
      }
    })
    .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
  const dueBasis: SessionCostInput['paymentMode'] = cost?.saved.paymentMode ?? 'break_even'
  return {
    players,
    amountDue,
    dueBasis,
    entranceFeeIncluded: estimate?.entranceFeePerHead,
    totals: paymentTotals({
      marks,
      total: roster.length,
      amountDue,
      cost: estimate?.total ?? null,
    }),
  }
}
function requirePaymentsWrite(state: MockState, sessionId: string) {
  const session = sessionIn(state, sessionId)
  // A cancelled session keeps its marks, read-only; refunds happen outside ROTRA.
  if (['invalid', 'finalizing', 'cancelled'].includes(session.state))
    throw new MockError('permission', 'Payments are not available for this session.')
  if (getMockDevState().licenseExpired && session.state !== 'active') requireClubAccess()
  if (getConnectivity() === 'offline' && state.downloads[sessionId] !== 'ready')
    throw new MockError('offline', 'No downloaded copy on this device. Connect, or download first.')
}
/** One atomic desired-state write; existing paid amounts/timestamps are never rewritten. */
export function setPaymentMarks({ sessionId, marks }: SetPaymentMarksInput) {
  if (!marks.length)
    return Promise.resolve({ data: { count: 0 }, savedOffline: false, message: '' })
  if (isRealDataMode()) return realSetPaymentMarks({ sessionId, marks })
  return queueMutation({ area: 'Payments' }, (state) => {
    requirePaymentsWrite(state, sessionId)
    const wanted = new Map(marks.map((mark) => [mark.clubPlayerId, mark.paid]))
    const amount = sessionCostIn(state, sessionId)?.estimate.perHead ?? 0
    for (const [clubPlayerId, paid] of wanted) {
      const player = state.roster.find(
        (p) => p.sessionId === sessionId && p.clubPlayerId === clubPlayerId,
      )
      if (!player) throw new MockError('permission', 'Player not in this session.')
      const mark = state.paymentMarks.find(
        (m) => m.sessionId === sessionId && m.sessionPlayerId === player.id,
      )
      if (!paid && mark) state.paymentMarks = state.paymentMarks.filter((m) => m !== mark)
      if (paid && !mark)
        state.paymentMarks.push({
          sessionId,
          sessionPlayerId: player.id,
          amountMinor: amount,
          currency: 'PHP',
          markedAt: Date.now(),
        })
    }
    const count = wanted.size
    return {
      data: { count },
      text: `${count} payment mark${count === 1 ? '' : 's'} saved`,
    }
  })
}
/**
 * #479 · records the amount received from one roster player. A positive amount replaces the mark
 * (amount and time); 0 removes it (not paid). Pricing changes never rewrite it.
 */
export function setPaymentAmount({ sessionId, clubPlayerId, amountMinor }: SetPaymentAmountInput) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
    return Promise.reject(new MockError('permission', 'Enter an amount, 0 or more.'))
  if (isRealDataMode()) return realSetPaymentAmount({ sessionId, clubPlayerId, amountMinor })
  return queueMutation({ area: 'Payments' }, (state) => {
    requirePaymentsWrite(state, sessionId)
    const player = state.roster.find(
      (p) => p.sessionId === sessionId && p.clubPlayerId === clubPlayerId,
    )
    if (!player) throw new MockError('permission', 'Player not in this session.')
    state.paymentMarks = state.paymentMarks.filter(
      (m) => !(m.sessionId === sessionId && m.sessionPlayerId === player.id),
    )
    if (!amountMinor)
      return { data: { paid: false }, text: `${player.nameSnapshot} marked not paid` }
    state.paymentMarks.push({
      sessionId,
      sessionPlayerId: player.id,
      amountMinor,
      currency: 'PHP',
      markedAt: Date.now(),
    })
    return {
      data: { paid: true },
      text: `${player.nameSnapshot} paid ${formatPeso(amountMinor)}`,
    }
  })
}
export function togglePaid({
  sessionId,
  clubPlayerId,
}: {
  sessionId: string
  clubPlayerId: string
}) {
  if (isRealDataMode()) return realTogglePaid({ sessionId, clubPlayerId })
  return queueMutation({ area: 'Payments' }, (state) => {
    requirePaymentsWrite(state, sessionId)
    const player = state.roster.find(
      (p) => p.sessionId === sessionId && p.clubPlayerId === clubPlayerId,
    )
    if (!player) throw new MockError('permission', 'Player not in this session.')
    const mark = state.paymentMarks.find(
      (m) => m.sessionId === sessionId && m.sessionPlayerId === player.id,
    )
    if (mark) {
      state.paymentMarks = state.paymentMarks.filter((m) => m !== mark)
      return { data: { paid: false }, text: `${player.nameSnapshot} marked not paid` }
    }
    const amount = sessionCostIn(state, sessionId)?.estimate.perHead ?? 0
    state.paymentMarks.push({
      sessionId,
      sessionPlayerId: player.id,
      amountMinor: amount,
      currency: 'PHP',
      markedAt: Date.now(),
    })
    return { data: { paid: true }, text: `${player.nameSnapshot} paid ${formatPeso(amount)}` }
  })
}
export function markAllPaid(sessionId: string) {
  if (isRealDataMode()) return realMarkAllPaid(sessionId)
  return queueMutation({ area: 'Payments' }, (state) => {
    requirePaymentsWrite(state, sessionId)
    const amount = sessionCostIn(state, sessionId)?.estimate.perHead ?? 0
    let count = 0
    for (const p of state.roster.filter((p) => p.sessionId === sessionId)) {
      if (state.paymentMarks.some((m) => m.sessionId === sessionId && m.sessionPlayerId === p.id))
        continue
      state.paymentMarks.push({
        sessionId,
        sessionPlayerId: p.id,
        amountMinor: amount,
        currency: 'PHP',
        markedAt: Date.now(),
      })
      count++
    }
    return { data: { count }, text: `${count} players marked paid` }
  })
}
