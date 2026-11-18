'use client'
import { useMockMutation } from '../mock/query'
import { moveSavedPlayer } from './moveSavedPlayer'
/** Edit details › "Same person as NAME?" › Move to NAME (toast "Moved to NAME"). */
export function useMoveSavedPlayer() {
  return useMockMutation(moveSavedPlayer)
}
