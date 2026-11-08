import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma, SocialProvider } from '../generated/prisma/client'
import {
  currentExperienceMonths,
  experienceUpdate,
  PERSONAL_DETAILS_VERSION,
  playingStyle,
} from '../player/profile'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'

const SOCIAL: SocialProvider[] = ['facebook', 'instagram', 'youtube', 'linkedin']
const E164 = /^\+639\d{9}$/

/**
 * Q-SAVED-PLAYERS › Edit details (owner decision 2026-11-08). The club fills in what it knows about
 * its own guest or unclaimed player so their registration is prefilled. A registered player owns
 * their details, so the club cannot edit them; a phone already on file is never replaced here.
 */
export type ClubPlayerDetailsDto = {
  clubPlayerId: string
  identity: 'guest' | 'pending' | 'unclaimed'
  fullName: string
  nickname: string | null
  phoneOnFile: boolean
  /** Unclaimed profiles only; null for guests */
  profile: {
    email: string
    playingStyle: string
    experienceYears: number | null
    experienceMonths: number | null
    socialLinks: Record<SocialProvider, string>
  } | null
}

async function loadEditable(context: ClubContext, clubPlayerId: string) {
  const row = await prisma.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    select: {
      id: true,
      displayName: true,
      nickname: true,
      playerId: true,
      privateInput: { select: { phoneE164: true } },
      player: {
        select: {
          profileState: true,
          personalDetails: true,
          experienceMonths: true,
          experienceRecordedAt: true,
          privateContact: { select: { phoneE164: true, email: true } },
          socialLinks: { select: { provider: true, url: true } },
        },
      },
    },
  })
  if (!row) throw new ServiceError('not_found')
  if (row.player?.profileState === 'claimed')
    throw new ServiceError('forbidden', {
      player: 'This player registered, so they keep their own details.',
    })
  return row
}

export async function readClubPlayerDetails(
  context: ClubContext,
  clubPlayerId: string,
): Promise<ClubPlayerDetailsDto> {
  await requireClubEntitlement(context)
  const row = await loadEditable(context, clubPlayerId)
  const player = row.player
  const months = player
    ? currentExperienceMonths(player.experienceMonths, player.experienceRecordedAt)
    : null
  const links = Object.fromEntries(SOCIAL.map((p) => [p, ''])) as Record<SocialProvider, string>
  for (const link of player?.socialLinks ?? []) links[link.provider] = link.url
  return {
    clubPlayerId: row.id,
    identity: player ? 'unclaimed' : row.privateInput?.phoneE164 ? 'pending' : 'guest',
    fullName: row.displayName,
    nickname: row.nickname,
    phoneOnFile: Boolean(player?.privateContact?.phoneE164 ?? row.privateInput?.phoneE164),
    profile: player
      ? {
          email: player.privateContact?.email ?? '',
          playingStyle: playingStyle(player.personalDetails),
          experienceYears: months == null ? null : Math.floor(months / 12),
          experienceMonths: months == null ? null : months % 12,
          socialLinks: links,
        }
      : null,
  }
}

export async function updateClubPlayerDetails(
  context: ClubContext,
  input: {
    clubPlayerId: string
    fullName: string
    nickname: string | null
    /** E.164 from the Route Handler; only used when no phone is on file */
    phoneE164: string | null
    email: string | null
    playingStyle: string
    experienceYears: number | null
    experienceMonths: number | null
    socialLinks: Partial<Record<SocialProvider, string>>
  },
) {
  await requireClubEntitlement(context)
  const fullName = input.fullName.trim()
  if (!fullName) throw new ServiceError('invalid', { fullName: 'Enter a name.' })
  const phone = input.phoneE164?.trim() || null
  if (phone && !E164.test(phone))
    throw new ServiceError('invalid', {
      phone: 'Enter a Philippine mobile number, like 0917 555 0142.',
    })
  const email = input.email?.trim().toLowerCase() || null
  if (email && !email.includes('@'))
    throw new ServiceError('invalid', { email: 'Enter an email address, like name@example.com.' })
  const years = input.experienceYears ?? 0
  const months = input.experienceMonths ?? 0
  if (
    !Number.isInteger(years) ||
    !Number.isInteger(months) ||
    years < 0 ||
    years > 80 ||
    months < 0 ||
    months > 11
  )
    throw new ServiceError('invalid', {
      experience: 'Enter whole years from 0 to 80 and months from 0 to 11.',
    })
  const experience =
    input.experienceYears == null && input.experienceMonths == null ? null : years * 12 + months

  const row = await loadEditable(context, input.clubPlayerId)
  const onFile = row.player?.privateContact?.phoneE164 ?? row.privateInput?.phoneE164 ?? null
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: context.clubId, id: row.id } },
      data: {
        displayName: fullName,
        nickname: input.nickname?.trim() || null,
        revision: { increment: 1 },
      },
    })
    if (phone && !onFile) {
      const taken = await tx.clubPlayer.findFirst({
        where: {
          clubId: context.clubId,
          id: { not: row.id },
          OR: [
            { privateInput: { phoneE164: phone } },
            { player: { privateContact: { phoneE164: phone } } },
          ],
        },
        select: { displayName: true },
      })
      if (taken)
        throw new ServiceError('conflict', {
          phone: `${taken.displayName} already has this number.`,
        })
    }
    if (!row.playerId || !row.player) {
      // Guest: a phone becomes private intake, matched to a profile like Add player's.
      if (phone && !onFile)
        await tx.clubPlayerPrivateInput.create({
          data: { clubPlayerId: row.id, clubId: context.clubId, phoneE164: phone, capturedAt: now },
        })
      return { clubPlayerId: row.id }
    }
    const playerId = row.playerId
    const contactPhone = row.player.privateContact?.phoneE164 ?? phone
    if (phone && !row.player.privateContact) {
      const owner = await tx.playerPrivateContact.findUnique({
        where: { phoneE164: phone },
        select: { playerId: true },
      })
      if (owner && owner.playerId !== playerId)
        throw new ServiceError('conflict', {
          phone: 'This number belongs to another ROTRA profile.',
        })
    }
    if (email) {
      const owner = await tx.playerPrivateContact.findUnique({
        where: { email },
        select: { playerId: true },
      })
      if (owner && owner.playerId !== playerId)
        throw new ServiceError('conflict', {
          email: 'This email belongs to another ROTRA account.',
        })
    }
    if (contactPhone) {
      await tx.playerPrivateContact.upsert({
        where: { playerId },
        update: { email, revision: { increment: 1 } },
        create: { playerId, phoneE164: contactPhone, email },
      })
    } else if (email) {
      throw new ServiceError('invalid', { email: 'Add their phone first, then their email.' })
    }
    const current = await tx.player.findUniqueOrThrow({
      where: { id: playerId },
      select: { experienceMonths: true, experienceRecordedAt: true, personalDetails: true },
    })
    const shown = currentExperienceMonths(current.experienceMonths, current.experienceRecordedAt)
    const details =
      current.personalDetails &&
      typeof current.personalDetails === 'object' &&
      !Array.isArray(current.personalDetails)
        ? (current.personalDetails as Record<string, unknown>)
        : {}
    await tx.player.update({
      where: { id: playerId },
      data: {
        fullName,
        nickname: input.nickname?.trim() || null,
        ...experienceUpdate(experience, shown, now),
        personalDetails: {
          ...details,
          playingStyle: input.playingStyle.trim(),
        } as Prisma.InputJsonValue,
        detailsVersion: PERSONAL_DETAILS_VERSION,
        revision: { increment: 1 },
      },
    })
    for (const provider of SOCIAL) {
      const url = input.socialLinks[provider]?.trim()
      if (url === undefined) continue
      if (!url) await tx.playerSocialLink.deleteMany({ where: { playerId, provider } })
      else
        await tx.playerSocialLink.upsert({
          where: { playerId_provider: { playerId, provider } },
          create: { playerId, provider, url },
          update: { url },
        })
    }
    return { clubPlayerId: row.id }
  })
}
