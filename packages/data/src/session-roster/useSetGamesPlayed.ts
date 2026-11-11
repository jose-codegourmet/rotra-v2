'use client'
import { useMockMutation } from '../mock/query'
import { setGamesPlayed } from './mutations'
/** Set games played (#717): one roster entry or `'all'`; refreshes roster, matches and standings. */
export function useSetGamesPlayed() {
  return useMockMutation(setGamesPlayed)
}
