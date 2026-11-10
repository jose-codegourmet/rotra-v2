'use client'
import { useMockMutation } from '../mock/query'
import { confirmRequest } from './requestDecisions'
/** Requests › Join › Confirm / Confirm guest / Confirm to waitlist, for every kind of join request. */
export function useConfirmRequest() {
  return useMockMutation(confirmRequest)
}
