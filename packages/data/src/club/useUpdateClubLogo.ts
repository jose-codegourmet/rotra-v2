'use client'
import { useMockMutation } from '../mock/query'
import { updateClubLogo } from './settings'
export function useUpdateClubLogo() {
  return useMockMutation(updateClubLogo)
}
