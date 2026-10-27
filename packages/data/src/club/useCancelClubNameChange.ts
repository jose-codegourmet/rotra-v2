'use client'
import { useMockMutation } from '../mock/query'
import { cancelClubNameChange } from './settings'
export function useCancelClubNameChange() {
  return useMockMutation(cancelClubNameChange)
}
