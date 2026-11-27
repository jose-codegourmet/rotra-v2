'use client'
import { useMockMutation } from '../mock/query'
import { renameClubPlayer } from './renameClubPlayer'

/**
 * Edit player › Save changes for a guest or unclaimed player (full name and nickname). On success
 * every query but auth refetches: the session roster, matches, the club player and Saved players.
 */
export function useRenameClubPlayer() {
  return useMockMutation(renameClubPlayer)
}
