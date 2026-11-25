'use client'
import { useMockMutation } from '../mock/query'
import { setHandicap } from './mutations'
/** Handicap · tonight (D-2026-11-25-03): saves one roster entry's marked spots. */
export function useSetHandicap() {
  return useMockMutation(setHandicap)
}
