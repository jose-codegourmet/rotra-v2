'use client'
import { useMockMutation } from '../mock/query'
import { swapFromMatch } from './control'
export function useSwapFromMatch() {
  return useMockMutation(swapFromMatch)
}
