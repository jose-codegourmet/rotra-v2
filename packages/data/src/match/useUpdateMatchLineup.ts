'use client'
import { useMockMutation } from '../mock/query'
import { updateMatchLineup } from './queue.mutations'
export function useUpdateMatchLineup() {
  return useMockMutation(updateMatchLineup)
}
