'use client'
import { useMockMutation } from '../mock/query'
import { cancelSession } from './mutations'
/** D-CANCEL-SESSION. Refreshes every session, calendar, public page, request and payment query. */
export function useCancelSession() {
  return useMockMutation(cancelSession)
}
