'use client'
import { enqueueRemoveRosterPlayer } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'

/**
 * Removing a roster player hides the row at once (counts and groups derive from the same overlaid
 * list) and saves in the roster burst batch (#718). A player added in the same burst and not sent
 * yet cancels out; a refused burst restores the row with one error toast. The per-item
 * confirmation stays where it is, on the screen.
 */
export function useRemoveRosterPlayer() {
  return useRosterEnqueue(enqueueRemoveRosterPlayer)
}
