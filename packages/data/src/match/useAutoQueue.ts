'use client'
import { useMockMutation } from '../mock/query'
import { autoQueue } from './queue.mutations'
export function useAutoQueue() {
  return useMockMutation(autoQueue)
}
