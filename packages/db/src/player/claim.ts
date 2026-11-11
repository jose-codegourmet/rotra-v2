import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { type ProviderAdmin, ProviderError } from '../auth/provider-admin'
import { AUTH_PROVIDER } from '../auth/supabase'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { allocateRtrId, linkClubRecordsByPhone } from './identity'
import { currentExperienceMonths, playingStyle } from './profile'

/**
 * Links last 7 days and work once; a new link revokes the player's earlier one (#244). The database
 * allows one active link per player (`player_claim_links_one_active_per_player`).
 */
export const CLAIM_LINK_DAYS = 7

const EXPIRED = 'The registration link has expired or was replaced.'
const NEEDS_PHONE = 'Add your mobile number to finish registering.'
const EMAIL_HAS_LOGIN =
  'This email already has a ROTRA login, such as a club or Admin account. Use a different email, or ask ROTRA for help.'
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

const NEEDS_PHONE_TO_INVITE = 'Add this player’s phone before inviting them.'

/**
 * Q-SAVED-PLAYERS · Invite. Issues a link for this club's unclaimed player and returns the plaintext
 * token once; only its digest is stored. Since D-2026-11-11-03 an unclaimed profile is the club's own
 * record (no `players` row), so its link is keyed by `(club_id, club_player_id)`
 * (`club_player_claim_links`); a linked, still-unclaimed `players` row keeps the player-keyed link.
 * Names or RTR IDs alone never issue a link: the record needs a phone.
 */
export async function issueClaimLink(context: ClubContext, clubPlayerId: string) {
  await requireClubEntitlement(context)
  const token = newToken()
  return prisma.$transaction(async (tx) => {
    const clubPlayer = await tx.clubPlayer.findUnique({
      where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
      select: {
        id: true,
        removedAt: true,
        privateInput: { select: { phoneE164: true } },
        player: { select: { id: true, profileState: true } },
      },
    })
    if (!clubPlayer || clubPlayer.removedAt) throw new ServiceError('not_found')
    const player = clubPlayer.player
    if (player?.profileState === 'claimed')
      throw new ServiceError('conflict', { player: 'This player has already registered.' })
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CLAIM_LINK_DAYS * 86_400_000)
    const tokenDigest = await digest(token)
    if (player) {
      await tx.playerClaimLink.updateMany({
        where: { playerId: player.id, state: 'active' },
        data: { state: 'revoked', revokedAt: now, revision: { increment: 1 } },
      })
      await tx.playerClaimLink.create({
        data: {
          playerId: player.id,
          issuingClubId: context.clubId,
          tokenDigest,
          issuedAt: now,
          expiresAt,
        },
      })
      return { token, expiresAt: toIso(expiresAt) }
    }
    if (!clubPlayer.privateInput?.phoneE164)
      throw new ServiceError('invalid', { player: NEEDS_PHONE_TO_INVITE })
    await tx.clubPlayerClaimLink.updateMany({
      where: { clubId: context.clubId, clubPlayerId: clubPlayer.id, state: 'active' },
      data: { state: 'revoked', revokedAt: now, revision: { increment: 1 } },
    })
    await tx.clubPlayerClaimLink.create({
      data: {
        clubId: context.clubId,
        clubPlayerId: clubPlayer.id,
        tokenDigest,
        issuedAt: now,
        expiresAt,
      },
    })
    return { token, expiresAt: toIso(expiresAt) }
  })
}

type LinkPlayer = NonNullable<Awaited<ReturnType<typeof findPlayerLink>>>['player']

/** The registration form's starting values, as text the way the form holds them. */
function presetOf(player: LinkPlayer) {
  const link = (provider: string) =>
    player.socialLinks.find((entry) => entry.provider === provider)?.url ?? ''
  const months = currentExperienceMonths(player.experienceMonths, player.experienceRecordedAt)
  return {
    fullName: player.fullName,
    nickname: player.nickname ?? '',
    email: player.privateContact?.email ?? '',
    playingStyle: playingStyle(player.personalDetails),
    experienceYears: months == null ? '' : String(Math.floor(months / 12)),
    experienceMonths: months == null ? '' : String(months % 12),
    facebook: link('facebook'),
    instagram: link('instagram'),
    youtube: link('youtube'),
    linkedin: link('linkedin'),
  }
}

/** A player-keyed link (a `players` row: registration staging or a linked unclaimed profile). */
async function findPlayerLink(tokenDigest: Uint8Array<ArrayBuffer>) {
  return prisma.playerClaimLink.findUnique({
    where: { tokenDigest },
    include: {
      issuingClub: { select: { name: true } },
      player: {
        select: {
          id: true,
          fullName: true,
          nickname: true,
          avatarRef: true,
          profileState: true,
          personalDetails: true,
          experienceMonths: true,
          experienceRecordedAt: true,
          socialLinks: { select: { provider: true, url: true } },
          idAllocation: { select: { rtrId: true } },
          privateContact: { select: { phoneE164: true, email: true } },
          account: { select: { authSubject: true } },
        },
      },
    },
  })
}

/** A record-keyed link: the club's own unclaimed record, with no `players` row yet. */
async function findRecordLink(tokenDigest: Uint8Array<ArrayBuffer>) {
  return prisma.clubPlayerClaimLink.findUnique({
    where: { tokenDigest },
    include: {
      clubPlayer: {
        select: {
          id: true,
          clubId: true,
          displayName: true,
          nickname: true,
          playerId: true,
          removedAt: true,
          club: { select: { name: true } },
          privateInput: { select: { phoneE164: true, email: true } },
        },
      },
    },
  })
}

async function findLink(token: string) {
  const tokenDigest = await digest(token)
  const player = await findPlayerLink(tokenDigest)
  if (player) return { kind: 'player' as const, link: player }
  const record = await findRecordLink(tokenDigest)
  return record ? { kind: 'record' as const, link: record } : null
}

/** The form's empty starting values for a club record: the club typed only name, nickname and email. */
function recordPresetOf(record: NonNullable<Awaited<ReturnType<typeof findRecordLink>>>) {
  return {
    fullName: record.clubPlayer.displayName,
    nickname: record.clubPlayer.nickname ?? '',
    email: record.clubPlayer.privateInput?.email ?? '',
    playingStyle: '',
    experienceYears: '',
    experienceMonths: '',
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
  }
}

/**
 * P-CLAIM read (`ClaimLink`): public identity, a masked phone and what the club entered for the form
 * (Queue › Edit details), including the email it typed. Nothing the player set is ever here: the
 * profile is unclaimed. A club record's link shows no RTR ID (given when they register) and no
 * picture.
 */
export async function readClaimLink(token: string) {
  const found = await findLink(token)
  if (!found || found.link.state === 'revoked') throw new ServiceError('not_found')
  if (found.kind === 'record') {
    const link = found.link
    if (link.clubPlayer.removedAt) throw new ServiceError('not_found')
    const status =
      link.state === 'consumed' || link.clubPlayer.playerId
        ? 'claimed'
        : link.expiresAt <= new Date()
          ? 'expired'
          : 'valid'
    return {
      status,
      clubName: link.clubPlayer.club.name,
      preview: {
        playerId: link.clubPlayer.playerId,
        fullName: link.clubPlayer.displayName,
        nickname: link.clubPlayer.nickname,
        rtrId: null,
        picture: null,
        maskedPhone: link.clubPlayer.privateInput?.phoneE164
          ? maskPhone(link.clubPlayer.privateInput.phoneE164)
          : '',
      },
      preset: recordPresetOf(link),
    }
  }
  const link = found.link
  if (!link.player.idAllocation) throw new ServiceError('not_found')
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
    preset: presetOf(link.player),
  }
}

const firstNameOf = (player: { fullName: string; nickname: string | null }) =>
  player.nickname || player.fullName.split(' ')[0] || player.fullName

async function createLogin(
  provider: ProviderAdmin,
  input: { operationRef: string; email: string; phoneE164: string; initialPassword: string },
) {
  try {
    return (await provider.createLogin(input)).subject
  } catch (error) {
    if (error instanceof ProviderError)
      throw error.code === 'provider_conflict'
        ? new ServiceError('conflict', { email: EMAIL_HAS_LOGIN })
        : new ServiceError('unavailable')
    throw error
  }
}

/**
 * Finish registering from a club record's link (D-2026-11-11-03). Staged like `completeClaim`: the
 * provider login is created first, keyed on the record so a retry reuses it; then one transaction
 * creates the player (claimed), its private contact, the RTR ID (the inviting club's founding
 * location), the account mapping, links this record and every other club's record with the same
 * phone, and consumes the link. A retry after success returns the same result.
 */
async function completeRecordClaim(
  provider: ProviderAdmin,
  link: NonNullable<Awaited<ReturnType<typeof findRecordLink>>>,
  input: { email: string; password: string; phoneE164?: string },
) {
  const record = link.clubPlayer
  const resultOf = async (tx: Pick<Prisma.TransactionClient, 'player'>, playerId: string) => {
    const player = await tx.player.findUniqueOrThrow({
      where: { id: playerId },
      select: { fullName: true, nickname: true, idAllocation: { select: { rtrId: true } } },
    })
    return { playerId, rtrId: player.idAllocation?.rtrId ?? '', firstName: firstNameOf(player) }
  }
  if (record.removedAt) throw new ServiceError('forbidden', { link: EXPIRED })
  if (record.playerId) {
    // Registered meanwhile: through this link (a retry) or by registering with the same phone.
    if (link.state === 'consumed') return resultOf(prisma, record.playerId)
    throw new ServiceError('forbidden', { link: 'This profile is already registered.' })
  }
  if (link.state !== 'active' || link.expiresAt <= new Date())
    throw new ServiceError('forbidden', { link: EXPIRED })
  // The club's phone on file wins; a record without one takes the player's own number here.
  const phoneE164 = record.privateInput?.phoneE164 ?? input.phoneE164
  if (!phoneE164) throw new ServiceError('invalid', { phone: NEEDS_PHONE })
  const owner = await prisma.playerPrivateContact.findUnique({
    where: { phoneE164 },
    select: { playerId: true },
  })
  if (owner) throw new ServiceError('conflict', { phone: PHONE_TAKEN })
  const taken = await prisma.playerPrivateContact.findUnique({
    where: { email: input.email },
    select: { playerId: true },
  })
  if (taken)
    throw new ServiceError('conflict', { email: 'This email is already used by another player.' })
  const subject = await createLogin(provider, {
    // Keyed on the club record, not the link: a retry from a reissued link reuses the same login.
    operationRef: `claim:record:${record.clubId}:${record.id}`,
    email: input.email,
    phoneE164,
    initialPassword: input.password,
  })
  return prisma.$transaction(async (tx) => {
    const current = await tx.clubPlayerClaimLink.findUniqueOrThrow({ where: { id: link.id } })
    const fresh = await tx.clubPlayer.findUniqueOrThrow({
      where: { clubId_id: { clubId: record.clubId, id: record.id } },
      select: { playerId: true },
    })
    if (fresh.playerId) {
      const account = await tx.playerAccount.findUnique({ where: { playerId: fresh.playerId } })
      if (account?.authSubject !== subject) throw new ServiceError('conflict')
      return resultOf(tx, fresh.playerId)
    }
    if (current.state !== 'active') throw new ServiceError('forbidden', { link: EXPIRED })
    const now = new Date()
    const player = await tx.player.create({
      data: { fullName: record.displayName, nickname: record.nickname, profileState: 'claimed' },
      select: { id: true, fullName: true, nickname: true },
    })
    const contact = await tx.playerPrivateContact.create({
      data: { playerId: player.id, phoneE164, email: input.email },
    })
    const rtrId = await allocateRtrId(tx, player.id, record.clubId, now)
    await tx.playerAccount.create({
      data: {
        playerId: player.id,
        authProvider: AUTH_PROVIDER,
        authSubject: subject,
        claimedAt: now,
        contactSyncVersion: contact.revision,
      },
    })
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: record.clubId, id: record.id } },
      data: { playerId: player.id, revision: { increment: 1 } },
    })
    if (record.privateInput)
      await tx.clubPlayerPrivateInput.update({
        where: { clubPlayerId: record.id },
        data: {
          state: 'resolved',
          resolvedPlayerId: player.id,
          resolvedAt: now,
          revision: { increment: 1 },
        },
      })
    // Every other club's record with this phone joins the new account (no Queue Master tap).
    await linkClubRecordsByPhone(tx, player.id, phoneE164, now)
    await tx.clubPlayerClaimLink.update({
      where: { id: link.id },
      data: { state: 'consumed', consumedAt: now, revision: { increment: 1 } },
    })
    return { playerId: player.id, rtrId, firstName: firstNameOf(player) }
  })
}

/**
 * P-CLAIM · Finish registering. Staged: (1) the provider login is created outside any transaction,
 * keyed on the player so a retry, lost response or reissued link reuses it; (2) one transaction
 * rechecks the link, records the email, maps the account, marks the profile claimed and consumes
 * the link.
 * A retry after success returns the same result. The password goes only to the provider.
 */
export async function completeClaim(
  provider: ProviderAdmin,
  input: { token: string; email: string; password: string; phoneE164?: string },
) {
  const email = input.email.trim().toLowerCase()
  const found = await findLink(input.token)
  if (!found || found.link.state === 'revoked')
    throw new ServiceError('forbidden', { link: EXPIRED })
  if (found.kind === 'record') return completeRecordClaim(provider, found.link, { ...input, email })
  const link = found.link
  const player = link.player
  const result = {
    playerId: player.id,
    rtrId: player.idAllocation?.rtrId ?? '',
    firstName: firstNameOf(player),
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

  const subject = await createLogin(provider, {
    // Keyed on the player, not the link: a retry from a reissued link reuses the same login.
    operationRef: `claim:${player.id}`,
    email,
    phoneE164,
    initialPassword: input.password,
  })

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
