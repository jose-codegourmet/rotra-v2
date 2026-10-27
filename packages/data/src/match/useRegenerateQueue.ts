'use client'
import { useMockMutation } from '../mock/query'
import { regenerateQueue } from './queue.mutations'
export function useRegenerateQueue() {
  return useMockMutation(regenerateQueue)
}
