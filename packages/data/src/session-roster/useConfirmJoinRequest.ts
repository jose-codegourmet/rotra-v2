'use client'
import { enqueueAcceptRequest } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'
/** Confirm a join request: applied at once, saved in the roster burst batch (#718). */
export function useConfirmJoinRequest() {
  return useRosterEnqueue(enqueueAcceptRequest)
}
