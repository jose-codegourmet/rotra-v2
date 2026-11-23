'use client'
import { useMockMutation } from '../mock/query'
import { pauseMatch } from './control'
export function usePauseMatch() {
  return useMockMutation(pauseMatch)
}
