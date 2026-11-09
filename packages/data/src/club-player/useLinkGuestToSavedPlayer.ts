'use client'
import { useMockMutation } from '../mock/query'
import { linkGuestToSavedPlayer } from './linkGuest'
export function useLinkGuestToSavedPlayer() {
  return useMockMutation(linkGuestToSavedPlayer)
}
