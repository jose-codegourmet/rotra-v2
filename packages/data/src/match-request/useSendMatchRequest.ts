'use client'
import { useMockMutation } from '../mock/query'
import { sendMatchRequest } from './fetchers'
import type { SendMatchRequestInput } from './matchRequest.types'
/**
 * Send request (Request a match sheet). Toast “Match request sent”. Refusals carry their toast text:
 * “This session isn't taking match requests” when no format is allowed, “Not allowed for requests
 * in this session” for a format the session leaves off. One open request per player.
 */
export function useSendMatchRequest(slug: string) {
  return useMockMutation((input: SendMatchRequestInput) => sendMatchRequest(slug, input))
}
