'use client'
import { enqueueDeclineRequest } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'
/** Decline a join request: applied at once, saved in the roster burst batch (#718). */
export function useDeclineJoinRequest() {
  return useRosterEnqueue(enqueueDeclineRequest)
}
