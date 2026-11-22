'use client'
import { useMockMutation } from '../mock/query'
import { removeSessionHost } from './fetchers'

/** Session management › Hosts › Remove (#1005): ends the host designation, never the registration. */
export function useRemoveSessionHost() {
  return useMockMutation(removeSessionHost)
}
