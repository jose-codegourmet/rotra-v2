'use client'
import { useMockMutation } from '../mock/query'
import { addSessionHost } from './fetchers'

/** Session management › Hosts › Add host (#1005): a trusted host joins the session's hosts. */
export function useAddSessionHost() {
  return useMockMutation(addSessionHost)
}
