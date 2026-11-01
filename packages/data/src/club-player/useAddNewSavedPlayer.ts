'use client'
import { useMockMutation } from '../mock/query'
import { addNewSavedPlayer } from './mutations'
export function useAddNewSavedPlayer() {
  return useMockMutation(addNewSavedPlayer)
}
