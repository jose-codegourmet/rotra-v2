'use client'
import { useMockMutation } from '../mock/query'
import { simulateClubNameApproval } from './settings'
/** Queue DevMenu only; Admin approves with useApproveClubNameChange. */
export function useSimulateClubNameApproval() {
  return useMockMutation(simulateClubNameApproval)
}
