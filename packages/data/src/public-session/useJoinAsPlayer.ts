'use client'
import { useMockMutation } from '../mock/query'
import { joinAsPlayer } from './playerMutations'
import type { JoinAsPlayerInput } from './publicSession.types'
/**
 * Request to join as NAME (signed-in Player, one tap). Toast: `message` (“Request sent”). One
 * pending request per account; refused while one is pending or once the Player has a slot or
 * waitlist place.
 */
export function useJoinAsPlayer(slug: string) {
  return useMockMutation((input: JoinAsPlayerInput) => joinAsPlayer(slug, input))
}
