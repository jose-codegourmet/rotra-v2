import 'server-only'
import { prisma } from '../client/prisma'
import type { VerifiedSubject } from './supabase'

/** Which app is asking: Queue → club account, Player Information → player, Admin → platform owner. */
export type AccountAudience = 'club' | 'player' | 'admin'

export type ClubContext = { kind: 'club'; subject: string; clubId: string }
/** `googleConnected`: ROTRA's own record (`player_accounts.google_email`) says Google is connected. */
export type PlayerContext = {
  kind: 'player'
  subject: string
  playerId: string
  googleConnected: boolean
}
export type AdminContext = { kind: 'admin'; subject: string; adminId: string }
export type AccountContext = ClubContext | PlayerContext | AdminContext

export type ContextFor<A extends AccountAudience> = Extract<AccountContext, { kind: A }>

/**
 * Maps a verified provider subject to the one account type the app accepts, from server-owned
 * state checked on every request: provisioned and not disabled (club), not disabled (player),
 * active (admin). A subject with no matching account for this audience gets null, even if it maps
 * to another account type.
 *
 * A session started by an OAuth provider (Google, D-2026-11-16-01) is a player's only while ROTRA's
 * own record says Google is connected (`player_accounts.google_email`): a provider identity that
 * Supabase attached by itself (same verified email) is not a ROTRA connection, so it signs nobody
 * in. Club and Admin accounts have no Google sign-in, so an OAuth session is never one of theirs.
 */
export async function loadAccountContext<A extends AccountAudience>(
  verified: VerifiedSubject,
  audience: A,
): Promise<ContextFor<A> | null> {
  const where = { authProvider: verified.provider, authSubject: verified.subject }
  switch (audience) {
    case 'club': {
      const account = await prisma.clubAccount.findUnique({
        where: { authProvider_authSubject: where },
        select: { clubId: true, provisionedAt: true, disabledAt: true },
      })
      if (!account?.provisionedAt || account.disabledAt || verified.oauth) return null
      return { kind: 'club', subject: verified.subject, clubId: account.clubId } as ContextFor<A>
    }
    case 'player': {
      const account = await prisma.playerAccount.findUnique({
        where: { authProvider_authSubject: where },
        select: { playerId: true, disabledAt: true, googleEmail: true },
      })
      if (!account || account.disabledAt) return null
      if (verified.oauth && !account.googleEmail) return null
      return {
        kind: 'player',
        subject: verified.subject,
        playerId: account.playerId,
        googleConnected: account.googleEmail !== null,
      } as ContextFor<A>
    }
    case 'admin': {
      const account = await prisma.adminAccount.findUnique({
        where: { authProvider_authSubject: where },
        select: { id: true, active: true },
      })
      if (!account?.active || verified.oauth) return null
      return { kind: 'admin', subject: verified.subject, adminId: account.id } as ContextFor<A>
    }
    default:
      return null
  }
}
