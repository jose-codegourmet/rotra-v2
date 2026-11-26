'use client'
import { useMockMutation } from '../mock/query'
import { backToPreparation } from './mutations'
/** D-BACK-TO-PREP: undoes Start while no game has started. Refreshes the session's queries. */
export function useBackToPreparation() {
  return useMockMutation(backToPreparation)
}
