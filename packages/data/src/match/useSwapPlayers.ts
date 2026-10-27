'use client'
import { useMockMutation } from '../mock/query'
import { swapPlayers } from './queue.mutations'
export function useSwapPlayers() {
  return useMockMutation(swapPlayers)
}
