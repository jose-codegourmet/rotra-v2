'use client'
import { useMockMutation } from '../mock/query'
import type { PlayerSessionInput } from '../public-session/publicSession.types'
import { cancelMatchRequest } from './fetchers'
/** Cancel on “Match request sent · the QM decides”. Toast “Match request cancelled”. */
export function useCancelMatchRequest(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => cancelMatchRequest(slug, input))
}
