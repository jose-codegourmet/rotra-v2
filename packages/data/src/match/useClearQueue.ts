'use client'
import { useMockMutation } from '../mock/query'
import { clearQueue } from './queue.mutations'
export function useClearQueue() {
  return useMockMutation(clearQueue)
}
