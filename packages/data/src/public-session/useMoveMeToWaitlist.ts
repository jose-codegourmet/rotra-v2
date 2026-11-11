'use client'
import { useMockMutation } from '../mock/query'
import { moveMeToWaitlist } from './playerMutations'
import type { PlayerSessionInput } from './publicSession.types'
/**
 * Move me to the waitlist (#735): the signed-in Player steps down to the front of the waitlist.
 * Toast “You moved to the waitlist”; the card then reads “Waitlist #N · you get a slot if one opens”.
 */
export function useMoveMeToWaitlist(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => moveMeToWaitlist(slug, input))
}
