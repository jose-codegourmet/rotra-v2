'use client'
import { useMockMutation } from '../mock/query'
import { addDirectoryPlayerToClub } from './mutations'
export function useAddDirectoryPlayerToClub() {
  return useMockMutation(addDirectoryPlayerToClub)
}
