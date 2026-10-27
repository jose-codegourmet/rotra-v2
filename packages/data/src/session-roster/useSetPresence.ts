'use client'
import { useMockMutation } from '../mock/query'
import { setPresence } from './mutations'
export function useSetPresence() {
  return useMockMutation(setPresence)
}
