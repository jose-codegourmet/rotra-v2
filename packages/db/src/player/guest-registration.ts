import 'server-only'
import type { CookieAdapter } from '../auth/supabase'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'
import { type ClaimDetails, registerFromClaim } from './account-access'
import { CLAIM_LINK_DAYS } from './claim'
import { allocateRtrId } from './identity'

const MATCH = { status: 'account-match' as const }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The registration page's context; no guest, player or private contact is exposed. `sessionSlug` (#689) is the session link the visitor came from
 * (Register with ROTRA, D-2026-11-09-06): it must be this club's session with a live publication.
 * It only adds the title and the way back; registering never sends a join request.
 */
export async function guestRegistrationClub(clubId: string, sessionSlug?: string | null) {
  if (!UUID.test(clubId)) throw new ServiceError('not_found')
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } })
  if (!club) throw new ServiceError('not_found')
  if (!sessionSlug)
    return { clubName: club.name, sessionTitle: null, sessionSlug: null, sessionPageUrl: null }
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: sessionSlug },
    select: {
      clubId: true,
      title: true,
      publicSlug: true,
      publication: { select: { state: true } },
    },
  })
  if (!session || session.clubId !== clubId || session.publication?.state === 'deleted')
    throw new ServiceError('not_found', { session: 'This session link is not available.' })
  return {
    clubName: club.name,
    sessionTitle: session.title,
    sessionSlug: session.publicSlug,
    sessionPageUrl: `/s/${encodeURIComponent(session.publicSlug)}`,
  }
}

/**
 * #490: independent registration. The club supplies the existing RTR allocation context only.
 * Never reads or writes club_players, roster, history attribution or permanent results.
 * A client-generated secret makes provider failures/lost replies retryable through the existing
 * claim staging. Only its digest is stored; a retry must still supply the same private contacts.
 */
export async function registerGuest(
  cookies: CookieAdapter,
  clubId: string,
  input: {
    attempt: string
    email: string
    phoneE164: string
    password: string
    details: ClaimDetails
  },
  sessionSlug?: string | null,
) {
  const context = await guestRegistrationClub(clubId, sessionSlug)
  if (!/^[a-f0-9]{64}$/.test(input.attempt)) throw new ServiceError('invalid')
  const email = input.email.trim().toLowerCase()
  const token = `registration:${input.attempt}`
  const tokenDigest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  )
  let prepared = false
  // Unique constraints also protect against claim/contact-change writes outside these locks.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      prepared = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${token}))`
        const previous = await tx.playerClaimLink.findUnique({
          where: { tokenDigest },
          include: { player: { select: { privateContact: true } } },
        })
        if (previous) {
          if (
            previous.issuingClubId !== clubId ||
            previous.player.privateContact?.phoneE164 !== input.phoneE164 ||
            previous.player.privateContact?.email !== email
          )
            throw new ServiceError('invalid', {
              registration: 'Start a new registration with these details.',
            })
          return true
        }
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`phone:${input.phoneE164}`}))`
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`registration-email:${email}`}))`
        const existing = await tx.playerPrivateContact.findFirst({
          where: { OR: [{ phoneE164: input.phoneE164 }, { email }] },
          select: { playerId: true },
        })
        if (existing) return false
        // Club/Admin logins also reserve an email, even without a Player account mapping.
        const provider = await tx.$queryRaw<{ present: boolean }[]>`
          SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = ${email}) AS present`
        if (provider[0]?.present) return false
        const now = new Date()
        const player = await tx.player.create({
          data: { fullName: input.details.fullName, nickname: input.details.nickname },
          select: { id: true },
        })
        await tx.playerPrivateContact.create({
          data: { playerId: player.id, phoneE164: input.phoneE164, email },
        })
        await allocateRtrId(tx, player.id, clubId, now)
        await tx.playerClaimLink.create({
          data: {
            playerId: player.id,
            issuingClubId: clubId,
            tokenDigest,
            issuedAt: now,
            expiresAt: new Date(now.getTime() + CLAIM_LINK_DAYS * 86_400_000),
          },
        })
        return true
      })
      break
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002' && attempt === 0) continue
      throw error
    }
  }
  if (!prepared) return MATCH
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await registerFromClaim(cookies, token, { ...input, email })
      return {
        status: 'registered' as const,
        ...result,
        clubName: context.clubName,
        sessionSlug: context.sessionSlug,
        sessionTitle: context.sessionTitle,
      }
    } catch (error) {
      // Two replies for the same attempt may reach account creation/profile saving together.
      // Retry after the winner commits; the consumed claim still requires the same password.
      if (
        attempt === 0 &&
        ((error as { code?: string }).code === 'P2002' ||
          (error instanceof ServiceError && error.code === 'conflict' && !error.fields))
      )
        continue
      // A provider account can win the race after preflight. Never use that existing account.
      if (error instanceof ServiceError && error.code === 'conflict' && error.fields?.email)
        return MATCH
      throw error
    }
  }
}
