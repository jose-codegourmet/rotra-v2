'use client'
import { useMockMutation } from '../mock/query'
import { setPlayerFree } from './fetchers'

/** D-2026-11-27-01 · Plays free on one player; flush the switch batch before calling it. */
export function useSetPlayerFree() {
  return useMockMutation(setPlayerFree)
}
