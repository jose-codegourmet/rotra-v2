'use client'
import { useMockMutation } from '../mock/query'
import { openCourtEarly } from './courts'
export function useOpenCourtEarly() {
  return useMockMutation(openCourtEarly)
}
