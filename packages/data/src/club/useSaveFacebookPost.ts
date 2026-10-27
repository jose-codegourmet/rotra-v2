'use client'
import { useMockMutation } from '../mock/query'
import { saveFacebookPost } from './settings'
export function useSaveFacebookPost() {
  return useMockMutation(saveFacebookPost)
}
