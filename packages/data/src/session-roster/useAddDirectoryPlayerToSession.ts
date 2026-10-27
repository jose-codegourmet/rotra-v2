'use client'
import { useMockMutation } from '../mock/query'
import { addDirectoryPlayerToSession } from './mutations'
export function useAddDirectoryPlayerToSession() {
  return useMockMutation(addDirectoryPlayerToSession)
}
