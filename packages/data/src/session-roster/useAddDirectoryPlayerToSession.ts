'use client'
import { enqueueAddDirectoryPlayer } from './enqueueRosterOps'
import { useRosterEnqueue } from './useRosterEnqueue'
/** Add player › Player Information: applied at once, saved in the roster burst batch (#718). */
export function useAddDirectoryPlayerToSession() {
  return useRosterEnqueue(enqueueAddDirectoryPlayer)
}
