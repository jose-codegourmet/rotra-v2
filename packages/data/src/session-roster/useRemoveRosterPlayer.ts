'use client'
import { useMockMutation } from '../mock/query'
import { removeRosterPlayer } from './mutations'
export function useRemoveRosterPlayer() {
  return useMockMutation(removeRosterPlayer)
}
