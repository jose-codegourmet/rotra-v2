'use client'
import { enqueueAddNewPlayer } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'
/** Add player › New player: applied at once, saved in the roster burst batch (#718). */
export function useAddNewPlayerToSession() {
  return useRosterEnqueue(enqueueAddNewPlayer)
}
