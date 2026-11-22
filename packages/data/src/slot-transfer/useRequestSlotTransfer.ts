'use client'
import { useMockMutation } from '../mock/query'
import { requestSlotTransfer } from './playerTransfers'
import type { RequestSlotTransferInput } from './slotTransfer.types'
/** **Send transfer request** (#1011): toast “Transfer to NAME sent · the QM decides”. */
export function useRequestSlotTransfer(slug: string) {
  return useMockMutation((input: RequestSlotTransferInput) => requestSlotTransfer(slug, input))
}
