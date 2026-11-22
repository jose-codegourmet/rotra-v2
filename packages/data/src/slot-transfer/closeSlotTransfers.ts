import type { MockState } from '../mock/store'
import type { SlotTransfer } from './slotTransfer.types'

/** The store's transfers; older saved states have none. */
export const slotTransfersOf = (state: Pick<MockState, 'slotTransfers'>): SlotTransfer[] =>
  state.slotTransfers ?? []

/** This session's pending transfers, oldest first. */
export const pendingSlotTransfers = (state: Pick<MockState, 'slotTransfers'>, sessionId: string) =>
  slotTransfersOf(state)
    .filter((t) => t.sessionId === sessionId && t.status === 'pending')
    .sort((a, b) => a.requestedAt - b.requestedAt)

/**
 * Pending transfers end with the pre-session window (#1011): Start makes them `expired`, Cancel
 * session (and the finish path, which never meets one) makes them `cancelled`. Mutates the draft;
 * decided transfers are never touched.
 */
export function closePendingSlotTransfers(
  state: MockState,
  sessionId: string,
  status: Extract<SlotTransfer['status'], 'expired' | 'cancelled'>,
  now = Date.now(),
) {
  let closed = 0
  for (const t of slotTransfersOf(state))
    if (t.sessionId === sessionId && t.status === 'pending') {
      t.status = status
      t.decidedAt = now
      closed++
    }
  return closed
}
