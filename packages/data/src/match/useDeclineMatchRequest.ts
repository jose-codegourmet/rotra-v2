'use client'
import { useMockMutation } from '../mock/query'
import { declineMatchRequest } from './matchRequestDecisions'
/** Requests › Match › Decline (toast “NAME's match request declined”). */
export function useDeclineMatchRequest() {
  return useMockMutation(declineMatchRequest)
}
