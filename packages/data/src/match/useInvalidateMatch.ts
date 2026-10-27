'use client'
import { useMockMutation } from '../mock/query'
import { invalidateMatch } from './control'
export function useInvalidateMatch() {
  return useMockMutation(invalidateMatch)
}
