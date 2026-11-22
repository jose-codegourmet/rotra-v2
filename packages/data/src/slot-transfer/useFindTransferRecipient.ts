'use client'
import { useMutation } from '@tanstack/react-query'
import { findTransferRecipient } from './playerTransfers'
import type { FindTransferRecipientInput } from './slotTransfer.types'
/**
 * **Find** on the Transfer my slot sheet (#1011): the recipient by exact RTR ID, or the refusal
 * (“No registered ROTRA player has that RTR ID.”, “NAME already has a slot in this session.”). A
 * read, so nothing else refreshes; `data` is a `TransferRecipient`.
 */
export function useFindTransferRecipient(slug: string) {
  return useMutation({
    mutationFn: (input: FindTransferRecipientInput) => findTransferRecipient(slug, input),
  })
}
