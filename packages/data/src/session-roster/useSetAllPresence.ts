'use client'
import { useMockMutation } from '../mock/query'
import { setAllPresence } from './mutations'
export function useSetAllPresence() {
  return useMockMutation(setAllPresence)
}
