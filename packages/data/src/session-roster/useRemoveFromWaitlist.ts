'use client'
import { useMockMutation } from '../mock/query'
import { removeFromWaitlist } from './mutations'
export function useRemoveFromWaitlist() {
  return useMockMutation(removeFromWaitlist)
}
