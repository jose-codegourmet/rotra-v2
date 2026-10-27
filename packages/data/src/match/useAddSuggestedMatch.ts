'use client'
import { useMockMutation } from '../mock/query'
import { addSuggestedMatch } from './queue.mutations'
export function useAddSuggestedMatch() {
  return useMockMutation(addSuggestedMatch)
}
