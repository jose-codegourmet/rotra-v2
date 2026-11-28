'use client'

import { NO_MATCH_REQUESTS_TEXT } from '@rotra/data/match-request/rules'
import { useMatchRequestOptions } from '@rotra/data/public-session/useMatchRequestOptions'
import { toast } from '@rotra/ui/toaster'

/**
 * MyNight's onRequestMatch: opens Request a match, or toasts "This session isn't taking match
 * requests" when the session allows no format. Opens anyway while the options are still loading.
 */
export function useRequestMatchAction(
  slug: string,
  playerId: string | null | undefined,
  open: () => void,
) {
  const options = useMatchRequestOptions(slug, playerId)
  return () => {
    if (options.data && options.data.allowedFormats.length === 0) toast(NO_MATCH_REQUESTS_TEXT)
    else open()
  }
}
