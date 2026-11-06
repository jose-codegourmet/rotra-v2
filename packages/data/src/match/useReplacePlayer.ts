'use client'
import { useMockMutation } from '../mock/query'
import { replacePlayer } from './control'
export function useReplacePlayer() {
  return useMockMutation(replacePlayer)
}
