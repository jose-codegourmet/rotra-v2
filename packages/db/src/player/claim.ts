import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { type ProviderAdmin, ProviderError } from '../auth/provider-admin'
import { AUTH_PROVIDER } from '../auth/supabase'
import { prisma } from '../client/prisma'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'

/**
 * Links last 7 days and work once (#244). TBD (owner, 2026-11-08): a new link no longer revokes
 * earlier ones; each simply expires, and once the profile is registered the others read as used.
 */
export const CLAIM_LINK_DAYS = 7

const EXPIRED = 'The registration link has expired or was replaced.'
const NEEDS_PHONE = 'Add your mobile number to finish registering.'
const PHONE_TAKEN = 'This number belongs to another ROTRA profile. Ask the club or ROTRA for help.'

async function digest(token: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Buffer.from(bytes).toString('base64url')
}

/** '+63 918 ••• ••77': country code, first three, last two. */
export function maskPhone(e164: string) {
  const digits = e164.replace(/^\+/, '')
  const country = digits.slice(0, digits.length - 10) || digits.slice(0, 2)
  const rest = digits.slice(country.length)
  return `+${country} ${rest.slice(0, 3)} ••• ••${rest.slice(-2)}`
}

/**
 * Q-SAVED-PLAYERS · Invite. Issues a link for this club's linked, unclaimed player and returns the
 * plaintext token once; only its digest is stored. Names or RTR IDs alone never issue a link.
 */
export async function issueClaimLink(context: ClubContext, clubPlayerId: string) {
  await requireClubEntitlement(context)
  const token = newToken()
  return prisma.$transaction(async (tx) => {
    const clubPlayer = await tx.clubPlayer.findUnique({
      where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
      select: { player: { select: { id: true, profileState: true } } },
    })
    if (!clubPlayer) throw new ServiceError('not_found')
    const player = clubPlayer.player
    if (!player)
      throw new ServiceError('invalid', { player: 'Add this player’s phone before inviting them.' })
    if (player.profileState === 'claimed')
      throw new ServiceError('conflict', { player: 'This player has already registered.' })
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CLAIM_LINK_DAYS * 86_400_000)
    await tx.playerClaimLink.create({
      data: {
        playerId: player.id,
        issuingClubId: context.clubId,
        tokenDigest: await digest(token),
        issuedAt: now,
        expiresAt,
      },
    })
    return { token, expiresAt: toIso(expiresAt) }
  })
}

async function findLink(token: string) {
  return prisma.playerClaimLink.findUnique({
    where: { tokenDigest: await digest(token) },
    include: {
      issuingClub: { select: { name: true } },
      player: {
        select: {
          id: true,
          fullName: true,
          nickname: true,
          avatarRef: true,
          profileState: true,
          socialLinks: { where: { provider: 'facebook' }, select: { url: true } },
          idAllocation: { select: { rtrId: true } },
          privateContact: { select: { phoneE164: true } },
          account: { select: { authSubject: true } },
        },
      },
    },
  })
}

/** P-CLAIM read (`ClaimLink`): public identity, a masked phone and the form's preset details only. */
export async function readClaimLink(token: string) {
  const link = await findLink(token)
  if (!link || link.state === 'revoked' || !link.player.idAllocation)
    throw new ServiceError('not_found')
  const status =
    link.state === 'consumed' || link.player.profileState === 'claimed'
      ? 'claimed'
      : link.expiresAt <= new Date()
        ? 'expired'
        : 'valid'
  return {
    status,
    clubName: link.issuingClub.name,
    preview: {
      playerId: link.player.id,
      fullName: link.player.fullName,
      nickname: link.player.nickname,
      rtrId: link.player.idAllocation.rtrId,
      picture: link.player.avatarRef,
      maskedPhone: link.player.privateContact
        ? maskPhone(link.player.privateContact.phoneE164)
        : '',
    },
    preset: {
      fullName: link.player.fullName,
      nickname: link.player.nickname ?? '',
      facebook: link.player.socialLinks[0]?.url ?? '',
    },
  }
}

/**
 * P-CLAIM · Finish registering. Staged: (1) the provider login is created outside any transaction,
 * keyed on the link ID so a retry or lost response reuses it; (2) one transaction rechecks the
 * link, records the email, maps the account, marks the profile claimed and consumes the link.
 * A retry after success returns the same result. The password goes only to the provider.
 */
export async function completeClaim(
  provider: ProviderAdmin,
  input: { token: string; email: string; password: string; phoneE164?: string },
) {
  const email = input.email.trim().toLowerCase()
  const link = await findLink(input.token)
  if (!link || link.state === 'revoked') throw new ServiceError('forbidden', { link: EXPIRED })
  const player = link.player
  const result = {
    playerId: player.id,
    rtrId: player.idAllocation?.rtrId ?? '',
    firstName: player.nickname || player.fullName.split(' ')[0] || player.fullName,
  }
  if (link.state === 'consumed' || player.profileState === 'claimed') {
    if (link.state === 'consumed') return result
    throw new ServiceError('forbidden', { link: 'This profile is already registered.' })
  }
  if (link.expiresAt <= new Date()) throw new ServiceError('forbidden', { link: EXPIRED })
  if (!player.idAllocation) throw new ServiceError('invalid', { link: EXPIRED })
  // A profile with no phone on file takes the player's own number here; one on file never changes.
  const phoneE164 = player.privateContact?.phoneE164 ?? input.phoneE164
  if (!phoneE164) throw new ServiceError('invalid', { phone: NEEDS_PHONE })
  if (!player.privateContact) {
    const owner = await prisma.playerPrivateContact.findUnique({
      where: { phoneE164 },
      select: { playerId: true },
    })
    if (owner && owner.playerId !== player.id)
      throw new ServiceError('conflict', { phone: PHONE_TAKEN })
  }
  const taken = await prisma.playerPrivateContact.findUnique({
    where: { email },
    select: { playerId: true },
  })
  if (taken && taken.playerId !== player.id)
    throw new ServiceError('conflict', { email: 'This email is already used by another player.' })

  let subject: string
  try {
    subject = (
      await provider.createLogin({
        operationRef: link.id,
        email,
        phoneE164,
        initialPassword: input.password,
      })
    ).subject
  } catch (error) {
    if (error instanceof ProviderError)
      throw new ServiceError(error.code === 'provider_conflict' ? 'conflict' : 'unavailable')
    throw error
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.playerClaimLink.findUniqueOrThrow({ where: { id: link.id } })
    const account = await tx.playerAccount.findUnique({ where: { playerId: player.id } })
    if (account) {
      if (account.authSubject !== subject) throw new ServiceError('conflict')
      return result
    }
    if (current.state !== 'active') throw new ServiceError('forbidden', { link: EXPIRED })
    const now = new Date()
    const contact = await tx.playerPrivateContact.upsert({
      where: { playerId: player.id },
      update: { email, emailVerifiedAt: null, revision: { increment: 1 } },
      create: { playerId: player.id, phoneE164, email },
    })
    await tx.playerAccount.create({
      data: {
        playerId: player.id,
        authProvider: AUTH_PROVIDER,
        authSubject: subject,
        claimedAt: now,
        contactSyncVersion: contact.revision,
      },
    })
    await tx.player.update({
      where: { id: player.id },
      data: { profileState: 'claimed', revision: { increment: 1 } },
    })
    await tx.playerClaimLink.update({
      where: { id: link.id },
      data: { state: 'consumed', consumedAt: now, revision: { increment: 1 } },
    })
    return result
  })
}
