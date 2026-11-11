import 'server-only'
import { newClubInviteCode, readClubInviteCode } from '@rotra/data/club/invite-code'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'

/**
 * Club invite link (D-2026-11-09-08, #712): one active code per club in `clubs.invite_code`.
 * `/register/<clubId>?k=<code>` registers or joins only with the current code; Regenerate link
 * overwrites it, so the old link and its QR images stop working. Players already in the club keep
 * their place (no club_players row is touched here).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ATTEMPTS = 5

/** The refusal for a missing, wrong or regenerated code, and for an unknown club. */
export const clubLinkUnavailable = () =>
  new ServiceError('not_found', { club: 'This club link is not available.' })

const isUniqueConflict = (error: unknown) => (error as { code?: string })?.code === 'P2002'

/**
 * Writes a fresh code. `onlyIfMissing` fills a club that has none yet (a club added after the
 * migration backfill) without replacing a code another request just wrote. Retries on the rare
 * unique conflict with another club's code.
 */
async function writeInviteCode(clubId: string, previous: string | null, onlyIfMissing: boolean) {
  for (let attempt = 0; ; attempt++) {
    const code = newClubInviteCode(undefined, previous)
    try {
      const { count } = await prisma.club.updateMany({
        where: onlyIfMissing ? { id: clubId, inviteCode: null } : { id: clubId },
        data: { inviteCode: code, revision: { increment: 1 } },
      })
      if (count) return code
      const current = await prisma.club.findUnique({
        where: { id: clubId },
        select: { inviteCode: true },
      })
      if (!current) throw new ServiceError('not_found')
      if (current.inviteCode) return current.inviteCode
    } catch (error) {
      if (!isUniqueConflict(error) || attempt + 1 >= ATTEMPTS) throw error
    }
  }
}

/** Q-CLUB › Club invite link: the club's current code, made on first read if it has none. */
export async function readClubInvite(context: ClubContext) {
  const club = await prisma.club.findUnique({
    where: { id: context.clubId },
    select: { inviteCode: true },
  })
  if (!club) throw new ServiceError('not_found')
  return { inviteCode: club.inviteCode ?? (await writeInviteCode(context.clubId, null, true)) }
}

/** Q-CLUB › Regenerate link: replaces the code; the old link is refused from now on. */
export async function regenerateClubInvite(context: ClubContext) {
  await requireClubEntitlement(context)
  const club = await prisma.club.findUnique({
    where: { id: context.clubId },
    select: { inviteCode: true },
  })
  if (!club) throw new ServiceError('not_found')
  return { inviteCode: await writeInviteCode(context.clubId, club.inviteCode, false) }
}

/**
 * Refuses a club link whose `k` is missing, wrong or regenerated (never a silent join). An
 * unknown club gets the same refusal, so a link never reveals which part was wrong.
 */
export async function requireClubInvite(clubId: string, inviteCode: unknown) {
  const code = readClubInviteCode(inviteCode)
  if (!UUID.test(clubId) || !code) throw clubLinkUnavailable()
  const club = await prisma.club.findFirst({
    where: { id: clubId, inviteCode: code },
    select: { id: true, name: true },
  })
  if (!club) throw clubLinkUnavailable()
  return club
}
