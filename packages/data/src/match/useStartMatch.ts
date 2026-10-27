'use client'
import { useMockMutation } from '../mock/query'
import { startMatch } from './control'
export function useStartMatch() {
  return useMockMutation(startMatch)
}
