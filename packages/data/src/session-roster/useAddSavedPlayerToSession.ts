'use client'
import { enqueueAddSavedPlayer } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'
/** Add player › Saved players: applied at once, saved in the roster burst batch (#718). */
export function useAddSavedPlayerToSession() {
  return useRosterEnqueue(enqueueAddSavedPlayer)
}
