import 'server-only'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import { readShownProfileBanners } from '../admin/profile-banners'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { clubPlayerForProfile, createClubPlayer } from './session-roster'
import { levelCodeFor, mapDatabaseError } from './session-store'

const SEARCH_LIMIT = 20

/** One saved club player as Saved players and the Add player sheet show them. Never carries a phone. */
export type ClubPlayerDto = {
  id: string
  clubId: string
  playerId: string | null
  fullName: string
  nickname: string | null
  picture: string | null
  /** Global name used with playerId to reproduce the saved character choice. */
  pictureName: string | null
  /** The resolved Profile banner: a registered player's pick, else the default Admin sets (D-2026-11-13-03) */
  bannerKey: string | null
  bannerImageUrl: string | null
  identity: 'registered' | 'unclaimed' | 'guest' | 'pending'
  rtrId: string | null
  /** The level from the club's latest assessment, or null when they have none yet */
  playingLevel: string | null
  phoneHidden: boolean
  hasPhone: boolean
  sessionsHere: number
  addedAt: string
}

/** Q-SAVED-PLAYERS: every player the club has saved, with identity, RTR ID and latest club level. */
export async function listClubPlayers(context: ClubContext): Promise<ClubPlayerDto[]> {
  const rows = await prisma.clubPlayer.findMany({
    where: { clubId: context.clubId, removedAt: null },
    orderBy: { displayName: 'asc' },
    select: {
      id: true,
      clubId: true,
      playerId: true,
      displayName: true,
      nickname: true,
      addedAt: true,
      privateInput: { select: { phoneE164: true } },
      player: {
        select: {
          avatarRef: true,
          fullName: true,
          nickname: true,
          profileState: true,
          banner: { select: { id: true, image: true } },
          hidePhoneFromClubs: true,
          privateContact: { select: { phoneE164: true } },
          idAllocation: { select: { rtrId: true } },
        },
      },
      assessments: {
        orderBy: { assessedAt: 'desc' },
        take: 1,
        select: { skillLevelId: true },
      },
      rosterEntries: { select: { sessionId: true } },
    },
  })
  const shownBanners = await readShownProfileBanners()
  return rows.map((p) => {
    // Only a registered player has chosen a banner; guests, unclaimed profiles and players with no
    // pick draw the default Admin sets (D-2026-11-13-03), as in mock mode.
    const banner =
      p.player?.profileState === 'claimed'
        ? resolveProfileBanner(
            p.player.banner?.id ?? null,
            () => p.player?.banner ?? undefined,
            shownBanners,
          )
        : resolveProfileBanner(null, () => undefined, shownBanners)
    return {
      id: p.id,
      clubId: p.clubId,
      playerId: p.playerId,
      // A linked profile's own name wins over the club's saved copy, so a claim or profile edit
      // shows on every card (#705). Guests have no profile and keep what the club entered.
      fullName: p.player?.fullName || p.displayName,
      nickname: p.player ? p.player.nickname : p.nickname,
      picture: p.player?.avatarRef ?? null,
      pictureName: p.player?.fullName ?? null,
      bannerKey: banner.bannerKey,
      bannerImageUrl: banner.bannerImageUrl,
      identity: p.player
        ? p.player.profileState === 'claimed'
          ? 'registered'
          : 'unclaimed'
        : p.privateInput?.phoneE164
          ? 'pending'
          : 'guest',
      rtrId: p.player?.idAllocation?.rtrId ?? null,
      playingLevel: levelCodeFor(p.assessments[0]?.skillLevelId ?? null),
      phoneHidden: p.player?.hidePhoneFromClubs ?? false,
      hasPhone: Boolean(p.player?.privateContact?.phoneE164 ?? p.privateInput?.phoneE164),
      sessionsHere: new Set(p.rosterEntries.map((r) => r.sessionId)).size,
      addedAt: p.addedAt.toISOString(),
    }
  })
}

/**
 * One Player Information result (Q-ADD-PLAYER › Player Information): a registered (claimed) player.
 * Never carries a phone.
 */
export type DirectoryPlayerDto = {
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
  identity: 'registered'
  /** The player's own profile picture (avatar reference), or null for initials */
  picture: string | null
  /** The player's current rank level, or null when they have none yet */
  suggestion: string | null
  phoneHidden: boolean
}

/**
 * Player Information search by name, nickname or RTR ID: registered (claimed) players only. Guests
 * and unclaimed profiles stay in the club that saved them and are never found by another club
 * (D-2026-11-11-03). Profiles this club already saved are left out (the sheet shows them under
 * Saved players), as are players who chose Hide me from Player Information (D-2026-11-12-01; a
 * club that saved them still adds them from Saved players). At most 20 results, by name.
 */
export async function searchPlayerDirectory(
  context: ClubContext,
  query: string,
): Promise<DirectoryPlayerDto[]> {
  const q = query.trim()
  const rows = await prisma.player.findMany({
    where: {
      profileState: 'claimed',
      idAllocation: { isNot: null },
      hiddenFromDirectory: false,
      // A profile the club deleted shows again, so it can be added back (which restores it).
      clubPlayers: { none: { clubId: context.clubId, removedAt: null } },
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { nickname: { contains: q, mode: 'insensitive' } },
              { idAllocation: { rtrId: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { fullName: 'asc' },
    take: SEARCH_LIMIT,
    select: {
      id: true,
      fullName: true,
      nickname: true,
      avatarRef: true,
      hidePhoneFromClubs: true,
      idAllocation: { select: { rtrId: true } },
      rankCurrent: { select: { skillLevelId: true } },
    },
  })
  return rows.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    nickname: p.nickname,
    rtrId: p.idAllocation?.rtrId ?? '',
    identity: 'registered',
    picture: p.avatarRef ?? null,
    suggestion: levelCodeFor(p.rankCurrent?.skillLevelId ?? null),
    phoneHidden: p.hidePhoneFromClubs,
  }))
}

const alreadySaved = (name: string) =>
  new ServiceError('conflict', { player: `${name} is already in your saved players.` })

/**
 * Saved players › Add player › Player Information: saves a profile to the club only, never to a
 * session. A profile already saved is refused. A level needs a session to be recorded
 * (`club_assessments`), so none is stored here; the club sets it when adding them to a session.
 */
export async function addDirectoryPlayerToClub(
  context: ClubContext,
  input: { operationId: string; playerId: string },
) {
  await requireClubEntitlement(context)
  try {
    return await prisma.$transaction(async (tx) => {
      const { clubPlayer, created } = await clubPlayerForProfile(
        tx,
        context,
        input.operationId,
        input.playerId,
        new Date(),
      )
      if (!created) throw alreadySaved(clubPlayer.displayName)
      return { clubPlayerId: clubPlayer.id, name: clubPlayer.nickname ?? clubPlayer.displayName }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/**
 * Saved players › Add player › New player: a guest (no phone) or a pending player (phone kept as
 * private intake) saved to the club only. A phone this club already has for a saved player is
 * refused; same-name guests are never merged. `phone` is E.164 from the Route Handler.
 */
export async function addNewSavedPlayer(
  context: ClubContext,
  input: { operationId: string; name: string; nickname?: string | null; phone?: string | null },
) {
  await requireClubEntitlement(context)
  try {
    return await prisma.$transaction(async (tx) => {
      if (input.phone) {
        const match = await tx.clubPlayer.findFirst({
          where: {
            clubId: context.clubId,
            removedAt: null,
            OR: [
              { privateInput: { phoneE164: input.phone } },
              { player: { privateContact: { phoneE164: input.phone } } },
            ],
          },
          select: { displayName: true },
        })
        if (match) throw alreadySaved(match.displayName)
      }
      const clubPlayer = await createClubPlayer(tx, context, input.operationId, input, new Date())
      return { clubPlayerId: clubPlayer.id, name: clubPlayer.displayName }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}
