'use client'
import { useMockMutation } from '../mock/query'
import { fillOpenSlots } from './mutations'
export function useFillOpenSlots() {
  return useMockMutation(fillOpenSlots)
}
