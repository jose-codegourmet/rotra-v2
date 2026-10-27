'use client'
import { useMockMutation } from '../mock/query'
import { substitutePlayer } from './control'
export function useSubstitutePlayer() {
  return useMockMutation(substitutePlayer)
}
