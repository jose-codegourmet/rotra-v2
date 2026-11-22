'use client'
import { useMockMutation } from '../mock/query'
import { approveSlotTransfer } from './transferDecisions'
/** Requests › Slot transfers › **Approve** (#1011): toast “SENDER's slot now belongs to RECIPIENT”. */
export function useApproveSlotTransfer() {
  return useMockMutation(approveSlotTransfer)
}
