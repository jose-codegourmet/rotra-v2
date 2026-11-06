'use client'
import { useMockMutation } from '../mock/query'
import { setCourtFillMode } from './courtFill'
/** The Manual Queue | Auto Queue switch. Needs internet; refused offline. */
export function useSetCourtFillMode() {
  return useMockMutation(setCourtFillMode)
}
