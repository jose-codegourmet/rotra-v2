'use client'
import { useMockMutation } from '../mock/query'
import { claimTransferLink } from './playerTransfers'
import type { ClaimTransferLinkInput } from './slotTransfer.types'
/** **Claim this slot** (#1012): first signed-in claimant only. Toast “Slot claimed · the QM decides”. */
export function useClaimTransferLink(slug: string) {
  return useMockMutation((input: ClaimTransferLinkInput) => claimTransferLink(slug, input))
}
