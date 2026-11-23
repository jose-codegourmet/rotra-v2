import { openSlots } from '../queue-session/queueSession.rules'
import type { SessionHostRegistration } from './sessionHost.types'

/**
 * Q-SETUP › Hosts (#1004): how many of the newly picked hosts get a slot and how many wait. Every new
 * host who is not on the roster or waitlist yet needs a place; they take the open slots first, then
 * (the preparation rule) the waitlist, in the order picked. `needingPlace` counts those hosts.
 */
export function hostPlacement(input: {
  capacity: number
  rosterCount: number
  needingPlace: number
}) {
  const slots = Math.min(input.needingPlace, openSlots(input.capacity, input.rosterCount))
  return { slots, waitlisted: input.needingPlace - slots }
}

/** "· 2 hosts registered · 1 host waitlisted" for the save toast; empty when nothing was placed. */
export function hostRegistrationText({ registered, waitlisted }: SessionHostRegistration) {
  const n = (k: number) => `${k} host${k === 1 ? '' : 's'}`
  return `${registered ? ` · ${n(registered)} registered` : ''}${waitlisted ? ` · ${n(waitlisted)} waitlisted` : ''}`
}
