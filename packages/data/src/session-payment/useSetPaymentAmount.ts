'use client'
import { useMockMutation } from '../mock/query'
import { setPaymentAmount } from './fetchers'

/** #479 · saves one player's amount received; flush the switch batch before calling it. */
export function useSetPaymentAmount() {
  return useMockMutation(setPaymentAmount)
}
