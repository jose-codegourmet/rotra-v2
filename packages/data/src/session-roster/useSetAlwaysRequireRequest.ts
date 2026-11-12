'use client'
import { useMockMutation } from '../mock/query'
import { setAlwaysRequireRequest } from './mutations'
/** Always require a request (D-2026-11-12-02): modelled on `useSetAcceptJoinRequests`. */
export function useSetAlwaysRequireRequest() {
  return useMockMutation(setAlwaysRequireRequest)
}
