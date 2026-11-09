'use client'
import { useMockMutation } from '../mock/query'
import { leaveSession } from './playerMutations'
import type { PlayerSessionInput } from './publicSession.types'
/**
 * I'm leaving: Present off with the “Left” mark; closes the player's open match request and any
 * naming them. Toast “Told the QM you're leaving”.
 */
export function useLeaveSession(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => leaveSession(slug, input))
}
