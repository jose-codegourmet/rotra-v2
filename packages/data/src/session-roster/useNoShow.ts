'use client'
import { useQuery } from '@tanstack/react-query'
import { useMockMutation } from '../mock/query'
import { getSessionNoShows } from './fetchers'
import { markNoShow, undoNoShow } from './mutations'
import { sessionRosterKeys } from './queryKeys'

/** The No show (cancelled) players of a live session, oldest first (empty in real mode for now). */
export function useSessionNoShows(sessionId: string) {
  return useQuery({
    queryKey: sessionRosterKeys.noShows(sessionId),
    queryFn: () => getSessionNoShows(sessionId),
  })
}
/**
 * Mark No show: the away player with no games comes off tonight's roster; toast "NAME marked No
 * show (cancelled) · 23/24". Refused with "Remove NAME from their match first." while in a match.
 */
export function useMarkNoShow() {
  return useMockMutation(markNoShow)
}
/** Back to roster: "NAME back on the roster · 24/24"; refused while the roster is full. */
export function useUndoNoShow() {
  return useMockMutation(undoNoShow)
}
