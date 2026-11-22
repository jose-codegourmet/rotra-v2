'use client'
import { useMockMutation } from '../mock/query'
import { removeTrustedHost } from './fetchers'

/** Club settings › Trusted hosts › Remove host: ends the trusted-host row; the saved player stays. */
export function useRemoveTrustedHost() {
  return useMockMutation(removeTrustedHost)
}
