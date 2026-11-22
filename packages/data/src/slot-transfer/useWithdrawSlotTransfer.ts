'use client'
import { useMockMutation } from '../mock/query'
import type { PlayerSessionInput } from '../public-session/publicSession.types'
import { withdrawSlotTransfer } from './playerTransfers'
/** **Withdraw request** on the Player's own pending transfer (#1011). */
export function useWithdrawSlotTransfer(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => withdrawSlotTransfer(slug, input))
}
