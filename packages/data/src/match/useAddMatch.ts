'use client'
import { useMockMutation } from '../mock/query'
import { addMatch } from './queue.mutations'
export function useAddMatch() {
  return useMockMutation(addMatch)
}
