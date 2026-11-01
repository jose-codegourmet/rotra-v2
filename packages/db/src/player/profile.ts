import 'server-only'
import type { ClubContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma, SocialProvider } from '../generated/prisma/client'
import { requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString } from '../service/serialize'

const SOCIAL: SocialProvider[] = ['facebook', 'instagram', 'youtube', 'linkedin']

/** Public profile allowlist (`PlayerProfile`). No contacts, account, claim or privacy fields. */
const PUBLIC_PLAYER_SELECT = {
  id: true,
  fullName: true,
  nickname: true,
  avatarRef: true,
  experienceMonths: true,
  personalDetails: true,
  idAllocation: { select: { rtrId: true } },
  socialLinks: { select: { provider: true, url: true } },
} satisfies Prisma.PlayerSelect

type PublicPlayerRow = Prisma.PlayerGetPayload<{ select: typeof PUBLIC_PLAYER_SELECT }>

function playingStyle(details: Prisma.JsonValue | null): string {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const style = (details as Record<string, unknown>).playingStyle
    if (typeof style === 'string') return style
  }
  return ''
}

/** Shapes `PlayerProfile`. Only profiles with a permanent RTR ID are public. */
function publicProfileDto(row: PublicPlayerRow) {
  if (!row.idAllocation) return null
  const links = Object.fromEntries(SOCIAL.map((p) => [p, ''])) as Record<SocialProvider, string>
  for (const link of row.socialLinks) links[link.provider] = link.url
  const months = row.experienceMonths
  return {
    playerId: row.id,
    rtrId: row.idAllocation.rtrId,
    fullName: row.fullName,
    nickname: row.nickname,
    picture: row.avatarRef,
    playingStyle: playingStyle(row.personalDetails),
    experienceYears: months == null ? null : Math.floor(months / 12),
    experienceMonths: months == null ? null : months % 12,
    socialLinks: links,
  }
}

/** P-PROFILE public read (`player.public-profile`). Safe for shared caches. */
export async function readPublicProfile(playerId: string) {
  const row = await prisma.player.findUnique({
    where: { id: playerId },
    select: PUBLIC_PLAYER_SELECT,
  })
  const dto = row && publicProfileDto(row)
  if (!dto) throw new ServiceError('not_found')
  return dto
}

/** Find a player by RTR ID (public). Identifies a profile; never authorizes claiming. */
export async function findPublicProfileByRtrId(rtrId: string) {
  const allocation = await prisma.playerIdAllocation.findUnique({
    where: { rtrId: rtrId.trim().toUpperCase() },
    select: { playerId: true },
  })
  if (!allocation) throw new ServiceError('not_found')
  return readPublicProfile(allocation.playerId)
}

/** `MyAccount`: the signed-in player's own private contacts. Private, no-store. */
export async function readMyAccount(context: PlayerContext) {
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: context.playerId },
    select: { id: true, hidePhoneFromClubs: true, revision: true, privateContact: true },
  })
  return {
    playerId: player.id,
    phone: player.privateContact?.phoneE164 ?? '',
    email: player.privateContact?.email ?? '',
    phoneHidden: player.hidePhoneFromClubs,
    revision: toDecimalString(player.revision),
  }
}

export async function readMyProfile(context: PlayerContext) {
  return readPublicProfile(context.playerId)
}

/**
 * P-PROFILE edit: name, nickname, picture, style details, experience and social links under the
 * loaded revision. Contacts are never editable here (they go through a contact change request).
 */
export async function updateMyProfile(
  context: PlayerContext,
  input: {
    expectedRevision: string
    fullName: string
    nickname: string | null
    picture: string | null
    playingStyle: string
    experienceYears: number | null
    experienceMonths: number | null
    socialLinks: Partial<Record<SocialProvider, string>>
  },
) {
  const fullName = input.fullName.trim()
  if (!fullName) throw new ServiceError('invalid', { fullName: 'Enter your full name.' })
  const years = input.experienceYears ?? 0
  const months = input.experienceMonths ?? 0
  if (
    !Number.isInteger(years) ||
    !Number.isInteger(months) ||
    years < 0 ||
    months < 0 ||
    months > 11
  )
    throw new ServiceError('invalid', { experience: 'Enter years and months of experience.' })
  const experience =
    input.experienceYears == null && input.experienceMonths == null ? null : years * 12 + months
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "players" WHERE "id" = ${context.playerId}::uuid FOR UPDATE`
    if (!rows.length) throw new ServiceError('not_found')
    const player = await tx.player.findUniqueOrThrow({ where: { id: context.playerId } })
    requireRevision(player.revision, input.expectedRevision)
    const now = new Date()
    await tx.player.update({
      where: { id: player.id },
      data: {
        fullName,
        nickname: input.nickname?.trim() || null,
        avatarRef: input.picture,
        experienceMonths: experience,
        experienceRecordedAt: experience === player.experienceMonths ? undefined : now,
        personalDetails: { playingStyle: input.playingStyle.trim() },
        revision: { increment: 1 },
      },
    })
    for (const provider of SOCIAL) {
      const url = input.socialLinks[provider]?.trim()
      if (url === undefined) continue
      if (!url) await tx.playerSocialLink.deleteMany({ where: { playerId: player.id, provider } })
      else
        await tx.playerSocialLink.upsert({
          where: { playerId_provider: { playerId: player.id, provider } },
          create: { playerId: player.id, provider, url },
          update: { url },
        })
    }
    const row = await tx.player.findUniqueOrThrow({
      where: { id: player.id },
      select: PUBLIC_PLAYER_SELECT,
    })
    return publicProfileDto(row)
  })
}

/** P-ACCOUNT · Hide my phone from clubs. */
export async function setPhonePrivacy(
  context: PlayerContext,
  input: { phoneHidden: boolean; expectedRevision: string },
) {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUniqueOrThrow({ where: { id: context.playerId } })
    if (player.hidePhoneFromClubs !== input.phoneHidden) {
      requireRevision(player.revision, input.expectedRevision)
      await tx.player.update({
        where: { id: player.id },
        data: { hidePhoneFromClubs: input.phoneHidden, revision: { increment: 1 } },
      })
    }
    return { phoneHidden: input.phoneHidden }
  })
}

/**
 * The phone a club may see for its own linked player: only when the player has not hidden it.
 * Returns no other contact field. Never used by public reads.
 */
export async function readClubVisiblePhone(context: ClubContext, clubPlayerId: string) {
  const clubPlayer = await prisma.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    select: {
      player: {
        select: { hidePhoneFromClubs: true, privateContact: { select: { phoneE164: true } } },
      },
    },
  })
  if (!clubPlayer) throw new ServiceError('not_found')
  const player = clubPlayer.player
  if (!player || player.hidePhoneFromClubs) return { phoneE164: null, hidden: !!player }
  return { phoneE164: player.privateContact?.phoneE164 ?? null, hidden: false }
}
