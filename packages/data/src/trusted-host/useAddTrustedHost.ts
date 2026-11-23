'use client'
import { useMockMutation } from '../mock/query'
import { addTrustedHost } from './fetchers'

/** Club settings › Trusted hosts › Add: a saved player joins the trusted-host list. */
export function useAddTrustedHost() {
  return useMockMutation(addTrustedHost)
}
