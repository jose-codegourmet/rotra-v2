'use client'
import { useMockMutation } from '../mock/query'
import { setRosterLevel } from './mutations'
export function useSetRosterLevel() {
  return useMockMutation(setRosterLevel)
}
