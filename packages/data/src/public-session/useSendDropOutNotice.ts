'use client'
import { useMockMutation } from '../mock/query'
import { sendDropOutNotice } from './playerMutations'
import type { PlayerSessionInput } from './publicSession.types'
/**
 * I can't make it (confirmed, before the start): one open drop-out notice per player; the slot
 * stays. Toast “Told the QM you can't make it”.
 */
export function useSendDropOutNotice(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => sendDropOutNotice(slug, input))
}
