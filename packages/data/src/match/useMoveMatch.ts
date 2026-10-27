'use client'
import { useMockMutation } from '../mock/query'
import { moveMatch } from './queue.mutations'
export function useMoveMatch() {
  return useMockMutation(moveMatch)
}
