'use client'
import { useMockMutation } from '../mock/query'
import { rejectAndRefundSlotTransfer } from './transferDecisions'
/**
 * Requests › Slot transfers › **Reject and refund** (#1014): records the manual full refund, cancels
 * the sender's registration and promotes the first eligible waitlisted player (FIFO).
 */
export function useRejectAndRefundSlotTransfer() {
  return useMockMutation(rejectAndRefundSlotTransfer)
}
