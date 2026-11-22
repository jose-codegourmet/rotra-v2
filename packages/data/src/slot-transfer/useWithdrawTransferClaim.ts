'use client'
import { useMockMutation } from '../mock/query'
import { withdrawTransferClaim } from './playerTransfers'
import type { ClaimTransferLinkInput } from './slotTransfer.types'
/** **Withdraw claim** (#1012): the transfer closes and the link stops working. */
export function useWithdrawTransferClaim(slug: string) {
  return useMockMutation((input: ClaimTransferLinkInput) => withdrawTransferClaim(slug, input))
}
