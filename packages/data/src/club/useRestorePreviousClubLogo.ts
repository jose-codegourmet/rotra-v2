'use client'
import { useMockMutation } from '../mock/query'
import { restorePreviousClubLogo } from './settings'
export function useRestorePreviousClubLogo() {
  return useMockMutation(restorePreviousClubLogo)
}
