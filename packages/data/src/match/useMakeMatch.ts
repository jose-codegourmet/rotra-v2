'use client'
import { useMockMutation } from '../mock/query'
import { makeMatch } from './queue.mutations'
export function useMakeMatch() {
  return useMockMutation(makeMatch)
}
