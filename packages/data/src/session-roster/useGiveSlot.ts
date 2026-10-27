'use client'
import { useMockMutation } from '../mock/query'
import { giveSlot } from './mutations'
export function useGiveSlot() {
  return useMockMutation(giveSlot)
}
