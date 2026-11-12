import 'server-only'
import { PROFILE_BANNER_NOT_PICKABLE } from '@rotra/data/profile-banner/rules'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { isProfileBannerPickable, resolvePlayerBanner } from '../admin/profile-banners'
import type { ClubContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma, ProfileVisibility, SocialProvider } from '../generated/prisma/client'
import { requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString } from '../service/serialize'

type Db = Prisma.TransactionClient | typeof prisma

const SOCIAL: SocialProvider[] = ['facebook', 'instagram', 'youtube', 'linkedin']

/**
 * Public profile allowlist (`PlayerProfile`). No contacts, account or claim fields; the visibility
 * level is read so the projection can mask an always-private player (D-2026-11-12-01).
 */
const PUBLIC_PLAYER_SELECT = {
  id: true,
  fullName: true,
  nickname: true,
  avatarRef: true,
  bannerId: true,
  banner: { select: { id: true, image: true } },
  profileVisibility: true,
  experienceMonths: true,
  experienceRecordedAt: true,
  personalDetails: true,
  idAllocation: { select: { rtrId: true } },
  socialLinks: { select: { provider: true, url: true } },
} satisfies Prisma.PlayerSelect

type PublicPlayerRow = Prisma.PlayerGetPayload<{ select: typeof PUBLIC_PLAYER_SELECT }>

export function playingStyle(details: Prisma.JsonValue | null): string {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const style = (details as Record<string, unknown>).playingStyle
    if (typeof style === 'string') return style
  }
  return ''
}

/**
 * Experience as of today. The stored months are a snapshot taken at `recordedAt`, so playing since is
 * fixed and the count keeps going (owner, 2026-11-08). Whole months only.
 */
export function currentExperienceMonths(
  months: number | null,
  recordedAt: Date | null,
  now = new Date(),
) {
  if (months == null) return null
  if (!recordedAt) return months
  const elapsed =
    (now.getUTCFullYear() - recordedAt.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - recordedAt.getUTCMonth())
  return months + Math.max(0, elapsed)
}

/** Shape version of `players.personal_details`; the database requires it whenever details are set. */
export const PERSONAL_DETAILS_VERSION = 1

/**
 * The experience columns for a save. Months and their recorded date are set or cleared together
 * (`players_experience_recorded_check`); an unchanged value keeps its original recorded date.
 */
export function experienceUpdate(next: number | null, shown: number | null, now: Date) {
  if (next === shown) return {}
  return next == null
    ? { experienceMonths: null, experienceRecordedAt: null }
    : { experienceMonths: next, experienceRecordedAt: now }
}

/**
 * Shapes `PlayerProfile`. Only profiles with a permanent RTR ID are public. An always-private
 * profile (D-2026-11-12-01) leaves here with the name masked, no nickname and no details; the
 * picture stays. `own` (the player's own read) keeps everything.
 */
function publicProfileDto(row: PublicPlayerRow, own = false) {
  if (!row.idAllocation) return null
  const links = Object.fromEntries(SOCIAL.map((p) => [p, ''])) as Record<SocialProvider, string>
  for (const link of row.socialLinks) links[link.provider] = link.url
  const months = currentExperienceMonths(row.experienceMonths, row.experienceRecordedAt)
  const masked = !own && row.profileVisibility === 'always_private'
  return {
    playerId: row.id,
    rtrId: row.idAllocation.rtrId,
    fullName: masked ? maskPublicName(row.fullName) : row.fullName,
    nickname: masked ? null : row.nickname,
    picture: row.avatarRef,
    bannerId: row.bannerId,
    profileVisibility: row.profileVisibility,
    playingStyle: masked ? '' : playingStyle(row.personalDetails),
    experienceYears: masked || months == null ? null : Math.floor(months / 12),
    experienceMonths: masked || months == null ? null : months % 12,
    socialLinks: masked
      ? (Object.fromEntries(SOCIAL.map((p) => [p, ''])) as Record<SocialProvider, string>)
      : links,
  }
}

/**
 * The profile with the banner its card draws (`bannerKey`, `bannerImageUrl`). The banner is public,
 * like the picture, so an always-private profile keeps it.
 */
async function profileWithBanner(db: Db, row: PublicPlayerRow, own = false) {
  const dto = publicProfileDto(row, own)
  if (!dto) return null
  return { ...dto, ...(await resolvePlayerBanner(row.banner, db)) }
}

/** P-PROFILE public read (`player.public-profile`). Safe for shared caches. */
export async function readPublicProfile(playerId: string, own = false) {
  // A URL segment that is not a UUID can name no player.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId))
    throw new ServiceError('not_found')
  const row = await prisma.player.findUnique({
    where: { id: playerId },
    select: PUBLIC_PLAYER_SELECT,
  })
  const dto = row && (await profileWithBanner(prisma, row, own))
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
    select: {
      id: true,
      hidePhoneFromClubs: true,
      profileVisibility: true,
      hiddenFromDirectory: true,
      revision: true,
      privateContact: true,
    },
  })
  return {
    playerId: player.id,
    phone: player.privateContact?.phoneE164 ?? '',
    email: player.privateContact?.email ?? '',
    phoneHidden: player.hidePhoneFromClubs,
    profileVisibility: player.profileVisibility,
    hiddenFromDirectory: player.hiddenFromDirectory,
    revision: toDecimalString(player.revision),
  }
}

/**
 * "Changed by ROTRA Admin: <reason>" on the player's own profile: the reason of the latest Admin
 * profile edit made while the profile was claimed (the mock notes only registered players). Never
 * part of the public profile.
 */
async function adminChangeNoteOf(db: Db, playerId: string) {
  const account = await db.playerAccount.findUnique({
    where: { playerId },
    select: { claimedAt: true, player: { select: { profileState: true } } },
  })
  if (!account || account.player.profileState !== 'claimed') return null
  const event = await db.adminAuditEvent.findFirst({
    where: {
      targetType: 'player',
      targetId: playerId,
      action: { in: ['player.profile_updated', 'player.password_set'] },
      occurredAt: { gte: account.claimedAt },
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: { metadata: true },
  })
  const metadata = event?.metadata
  const reason =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).reason
      : null
  return typeof reason === 'string' && reason ? reason : null
}

/** The public profile plus the owner-only Admin change note (P-EDIT-PROFILE). Private, no-store. */
async function ownProfile(db: Db, profile: Awaited<ReturnType<typeof profileWithBanner>>) {
  if (!profile) return profile
  const note = await adminChangeNoteOf(db, profile.playerId)
  return note ? { ...profile, adminChangeNote: note } : profile
}

export async function readMyProfile(context: PlayerContext) {
  return ownProfile(prisma, await readPublicProfile(context.playerId, true))
}

/**
 * P-PROFILE edit: name, nickname, style details, experience and social links under the
 * loaded revision. Contacts are never editable here (they go through a contact change request).
 */
export async function updateMyProfile(
  context: PlayerContext,
  input: {
    expectedRevision: string
    fullName: string
    nickname: string | null
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
        ...experienceUpdate(
          experience,
          currentExperienceMonths(player.experienceMonths, player.experienceRecordedAt),
          now,
        ),
        personalDetails: { playingStyle: input.playingStyle.trim() },
        detailsVersion: PERSONAL_DETAILS_VERSION,
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
    return ownProfile(tx, await profileWithBanner(tx, row, true))
  })
}

/**
 * Edit profile › Name › Banner, applied at once under the loaded revision. Only a shown, not deleted
 * banner can be newly picked; keeping the current one is allowed even when it is hidden. Players
 * never upload a banner.
 */
export async function setMyProfileBanner(
  context: PlayerContext,
  input: { bannerId: string; expectedRevision: string },
) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "players" WHERE "id" = ${context.playerId}::uuid FOR UPDATE`
    if (!rows.length) throw new ServiceError('not_found')
    const player = await tx.player.findUniqueOrThrow({ where: { id: context.playerId } })
    if (player.bannerId !== input.bannerId) {
      requireRevision(player.revision, input.expectedRevision)
      if (!(await isProfileBannerPickable(input.bannerId, tx)))
        throw new ServiceError('conflict', { banner: PROFILE_BANNER_NOT_PICKABLE })
      await tx.player.update({
        where: { id: player.id },
        data: { bannerId: input.bannerId, revision: { increment: 1 } },
      })
    }
    const row = await tx.player.findUniqueOrThrow({
      where: { id: player.id },
      select: PUBLIC_PLAYER_SELECT,
    })
    return ownProfile(tx, await profileWithBanner(tx, row, true))
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

/** P-PROFILE-PRIVACY · Profile visibility (D-2026-11-12-01), under the loaded account revision. */
export async function setProfileVisibility(
  context: PlayerContext,
  input: { profileVisibility: ProfileVisibility; expectedRevision: string },
) {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUniqueOrThrow({ where: { id: context.playerId } })
    if (player.profileVisibility !== input.profileVisibility) {
      requireRevision(player.revision, input.expectedRevision)
      await tx.player.update({
        where: { id: player.id },
        data: { profileVisibility: input.profileVisibility, revision: { increment: 1 } },
      })
    }
    return { profileVisibility: input.profileVisibility }
  })
}

/** P-PROFILE-PRIVACY · Hide me from Player Information, under the loaded account revision. */
export async function setHiddenFromDirectory(
  context: PlayerContext,
  input: { hiddenFromDirectory: boolean; expectedRevision: string },
) {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUniqueOrThrow({ where: { id: context.playerId } })
    if (player.hiddenFromDirectory !== input.hiddenFromDirectory) {
      requireRevision(player.revision, input.expectedRevision)
      await tx.player.update({
        where: { id: player.id },
        data: { hiddenFromDirectory: input.hiddenFromDirectory, revision: { increment: 1 } },
      })
    }
    return { hiddenFromDirectory: input.hiddenFromDirectory }
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
