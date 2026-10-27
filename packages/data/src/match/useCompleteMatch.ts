'use client'
import { useMockMutation } from '../mock/query'
import { completeMatch } from './control'
export function useCompleteMatch() {
  return useMockMutation(completeMatch)
}
