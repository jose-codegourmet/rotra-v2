'use client'
import { useMockMutation } from '../mock/query'
import { regenerateClubInvite } from './settings'
export function useRegenerateClubInvite() {
  return useMockMutation(regenerateClubInvite)
}
