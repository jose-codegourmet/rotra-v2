'use client'
import { useMockMutation } from '../mock/query'
import { approveClubNameChange } from './settings'
export function useApproveClubNameChange() {
  return useMockMutation(approveClubNameChange)
}
