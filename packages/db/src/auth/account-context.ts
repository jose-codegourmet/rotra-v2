import 'server-only'
import { prisma } from '../client/prisma'
import type { VerifiedSubject } from './supabase'

/** Which app is asking: Queue → club account, Player Information → player, Admin → platform owner. */
export type AccountAudience = 'club' | 'player' | 'admin'

export type ClubContext = { kind: 'club'; subject: string; clubId: string }
export type PlayerContext = { kind: 'player'; subject: string; playerId: string }
export type AdminContext = { kind: 'admin'; subject: string; adminId: string }
export type AccountContext = ClubContext | PlayerContext | AdminContext

export type ContextFor<A extends AccountAudience> = Extract<AccountContext, { kind: A }>

/**
 * Maps a verified provider subject to the one account type the app accepts, from server-owned
 * state checked on every request: provisioned and not disabled (club), not disabled (player),
 * active (admin). A subject with no matching account for this audience gets null, even if it maps
 * to another account type.
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
      if (!account?.provisionedAt || account.disabledAt) return null
      return { kind: 'club', subject: verified.subject, clubId: account.clubId } as ContextFor<A>
    }
    case 'player': {
      const account = await prisma.playerAccount.findUnique({
        where: { authProvider_authSubject: where },
        select: { playerId: true, disabledAt: true },
      })
      if (!account || account.disabledAt) return null
      return {
        kind: 'player',
        subject: verified.subject,
        playerId: account.playerId,
      } as ContextFor<A>
    }
    case 'admin': {
      const account = await prisma.adminAccount.findUnique({
        where: { authProvider_authSubject: where },
        select: { id: true, active: true },
      })
      if (!account?.active) return null
      return { kind: 'admin', subject: verified.subject, adminId: account.id } as ContextFor<A>
    }
    default:
      return null
  }
}
