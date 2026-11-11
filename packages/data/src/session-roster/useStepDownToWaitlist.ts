'use client'
import { useMockMutation } from '../mock/query'
import { stepDownToWaitlist } from './mutations'
/**
 * Move to waitlist (#735): the roster player goes to the front of the waitlist; toast “NAME moved
 * to the waitlist”. Refused with “Finish or remove NAME's match first.” while they are in a match.
 */
export function useStepDownToWaitlist() {
  return useMockMutation(stepDownToWaitlist)
}
