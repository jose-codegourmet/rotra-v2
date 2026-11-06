'use client'
import { useMockMutation } from '../mock/query'
import { swapWithQueue } from './control'
export function useSwapWithQueue() {
  return useMockMutation(swapWithQueue)
}
