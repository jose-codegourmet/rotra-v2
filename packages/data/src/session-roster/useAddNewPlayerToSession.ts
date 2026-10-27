'use client'
import { useMockMutation } from '../mock/query'
import { addNewPlayerToSession } from './mutations'
export function useAddNewPlayerToSession() {
  return useMockMutation(addNewPlayerToSession)
}
