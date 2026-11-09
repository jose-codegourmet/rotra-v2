'use client'
import { useMockMutation } from '../mock/query'
import { cancelMyJoinRequest } from './playerMutations'
import type { PlayerSessionInput } from './publicSession.types'
/**
 * Cancel request on the account's pending join request (it becomes `cancelled`). Toast: “Request
 * cancelled”.
 */
export function useCancelMyJoinRequest(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => cancelMyJoinRequest(slug, input))
}
