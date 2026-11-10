'use client'
import { useMockMutation } from '../mock/query'
import { dismissJoinRequestLink } from './requestDecisions'
/** Requests › Join › phone-match prompt › Not them (no toast; the prompt hides). */
export function useDismissJoinRequestLink() {
  return useMockMutation(dismissJoinRequestLink)
}
