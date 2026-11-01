'use client'
import { useMockMutation } from '../mock/query'
import { undoCourtEarlyOpen } from './courts'
export function useUndoCourtEarlyOpen() {
  return useMockMutation(undoCourtEarlyOpen)
}
