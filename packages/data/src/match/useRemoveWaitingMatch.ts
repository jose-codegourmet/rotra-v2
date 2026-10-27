'use client'
import { useMockMutation } from '../mock/query'
import { removeWaitingMatch } from './queue.mutations'
export function useRemoveWaitingMatch() {
  return useMockMutation(removeWaitingMatch)
}
