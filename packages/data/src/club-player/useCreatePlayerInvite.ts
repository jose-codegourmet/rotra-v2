'use client'
import { useMockMutation } from '../mock/query'
import { createPlayerInvite } from './fetchers'
/**
 * Makes a guest's or unclaimed player's own invite link (D-2026-11-18-07): registering through it
 * claims that record. Making a link changes nothing a screen shows, so it resolves as soon as the
 * link is made (a copy to the clipboard must not wait for a refetch).
 */
export function useCreatePlayerInvite() {
  return useMockMutation(createPlayerInvite, { backgroundRefresh: true })
}
