'use client'
import { useMockMutation } from '../mock/query'
import { selfCheckIn } from './playerMutations'
import type { PlayerSessionInput } from './publicSession.types'
/**
 * I'm here (live session, confirmed Player): Present with the “checked in themselves” mark. Toast
 * “Checked in”, or “Checked in · the QM will see it when their device syncs” while the club device
 * is offline.
 */
export function useSelfCheckIn(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => selfCheckIn(slug, input))
}
