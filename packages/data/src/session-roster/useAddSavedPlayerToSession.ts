'use client'
import { useMockMutation } from '../mock/query'
import { addSavedPlayerToSession } from './mutations'
export function useAddSavedPlayerToSession() {
  return useMockMutation(addSavedPlayerToSession)
}
