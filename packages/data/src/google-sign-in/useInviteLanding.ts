'use client'
import { useQuery } from '@tanstack/react-query'
import { getInviteLanding, inviteLinkKey } from './fetchers'
import type { InviteLink } from './googleSignIn.types'
import { googleSignInKeys } from './queryKeys'

/**
 * An invite link's card (P-INVITE: club, session with or without an inviter, Admin link) and the
 * viewer's state (visitor, ready, already a member, own invite, already in, on the waitlist, request
 * pending). Pass the signed-in player's id (`null` signed out) so the answer follows the account.
 * Reading it never joins anyone.
 */
export function useInviteLanding(link: InviteLink, signedInPlayerId: string | null) {
  return useQuery({
    queryKey: googleSignInKeys.invite(inviteLinkKey(link), signedInPlayerId),
    queryFn: ({ signal }) => getInviteLanding(link, signal),
    networkMode: 'always',
    retry: false,
  })
}
