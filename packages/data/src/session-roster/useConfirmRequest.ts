'use client'
import { enqueueAcceptRequest } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'
/**
 * Requests › Join › Confirm / Confirm guest / Confirm to waitlist, for every kind of join request:
 * applied at once, saved in the roster burst batch (#718). Accept then decline of the same request
 * in one burst: the last decision is the one sent.
 */
export function useConfirmRequest() {
  return useRosterEnqueue(enqueueAcceptRequest)
}
