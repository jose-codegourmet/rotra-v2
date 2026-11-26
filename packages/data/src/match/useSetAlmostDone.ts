'use client'
import { useMockMutation } from '../mock/query'
import { setAlmostDone } from './control'
export function useSetAlmostDone() {
  return useMockMutation(setAlmostDone)
}
