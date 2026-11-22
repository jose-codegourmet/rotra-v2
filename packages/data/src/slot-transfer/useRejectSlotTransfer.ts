'use client'
import { useMockMutation } from '../mock/query'
import { rejectSlotTransfer } from './transferDecisions'
/** Requests › Slot transfers › **Reject** (#1011): toast “Transfer rejected · SENDER keeps the slot”. */
export function useRejectSlotTransfer() {
  return useMockMutation(rejectSlotTransfer)
}
