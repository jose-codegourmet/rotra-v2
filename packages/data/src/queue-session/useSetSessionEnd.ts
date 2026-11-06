'use client'
import { useMockMutation } from '../mock/query'
import { setSessionEnd } from './courts'
/** Courts and time › Set end time: `mutate({ sessionId, endAt })`. */
export function useSetSessionEnd() {
  return useMockMutation(setSessionEnd)
}
