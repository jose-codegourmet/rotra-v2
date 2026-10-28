import type { MockState } from '../mock/store'
import { readMockState } from '../mock/store'
import { delay } from '../mock/latency'
import { sessionIn } from '../mock/transaction'
import { estimateSessionCost } from './sessionCost.rules'

export function sessionCostIn(state: MockState, id: string) {
  const session = sessionIn(state, id), saved = state.costEstimates[id]
  if (!saved) return null
  const courts = state.courts.filter((c) => c.sessionId === id && !c.removedAt).length
  const estimate = estimateSessionCost(saved, {
    courts, durationMinutes: Math.round((session.scheduledEndAt - session.scheduledStartAt) / 60000),
    players: state.roster.filter((p) => p.sessionId === id).length || session.expectedPlayers || 1,
    inventory: state.inventory.filter((i) => i.clubId === session.clubId),
  })
  const shuttleLines = saved.shuttles.map((line, index) => ({ ...line, id: `${id}-${index}`, name: state.inventory.find((i) => i.id === line.inventoryItemId)?.name ?? '' }))
  return { saved, estimate, courts, durationMinutes: Math.round((session.scheduledEndAt - session.scheduledStartAt) / 60000), shuttleLines }
}
export async function getSessionCostEstimate(id: string) { await delay(); return sessionCostIn(readMockState(), id) }
