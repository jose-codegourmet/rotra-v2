import 'server-only'
import { yearGameStats } from '@rotra/data/player/rules'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import type { ParticipantStatsRead } from '@rotra/data/public-session/types'
import { normalizeSocialLink } from '@rotra/schema/social-link'
import { readShownProfileBanners } from '../admin/profile-banners'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { readPlayerMatchHistory } from '../player/projections'
import {
  normalizeEmail,
  normalizeRtrId,
  openEntryByEmail,
  openEntryByRtrId,
  openEntryBySocialKey,
  registeredPlayerByEmail,
} from '../player/shared-entry'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { clubPlayerForProfile, createClubPlayer } from './session-roster'
import { levelCodeFor, mapDatabaseError } from './session-store'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** One saved club player as Saved players and the Add player sheet show them. Never carries a phone or an email. */
export type ClubPlayerDto = {
  id: string
  clubId: string
  /**
   * A registered player's id; for an unclaimed player saved with an email, their shared entry's id
   * (one email, one person, one RTR ID across clubs; D-2026-11-16-04), as mock mode. Null for a
   * guest and an older record with a phone and no email.
   */
  playerId: string | null
  fullName: string
  /** The nickname players see: a registered player's account nickname, else the club's */
  nickname: string | null
  /**
   * The club's own nickname for a registered player (D-2026-11-18-03): this club's Queue Master
   * reads only. Null for guests and unclaimed players (their `nickname` is already the club's).
   */
  clubNickname: string | null
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
  /** The club saved an email for this unclaimed player (never the email itself) */
  emailOnFile: boolean
  /** Details required: an older unclaimed record with a phone and no email (D-2026-11-16-04) */
  detailsRequired: boolean
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
      avatarRef: true,
      privateInput: { select: { phoneE164: true } },
      sharedEntry: { select: { id: true, rtrId: true, claimedPlayerId: true, email: true } },
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
    const registered = p.player?.profileState === 'claimed'
    // Only a registered player has chosen a banner; guests, unclaimed profiles and players with no
    // pick draw the default Admin sets (D-2026-11-13-03), as in mock mode.
    const banner = registered
      ? resolveProfileBanner(
          p.player?.banner?.id ?? null,
          () => p.player?.banner ?? undefined,
          shownBanners,
        )
      : resolveProfileBanner(null, () => undefined, shownBanners)
    const entry =
      !registered && p.sharedEntry && !p.sharedEntry.claimedPlayerId ? p.sharedEntry : null
    const phone = p.privateInput?.phoneE164
    const detailsRequired = !registered && !entry && !p.player && Boolean(phone)
    return {
      id: p.id,
      clubId: p.clubId,
      playerId: registered ? p.playerId : (entry?.id ?? p.playerId),
      // A registered player's own name wins over the club's saved copy, so a claim or profile edit
      // shows on every card (#705). Guests and unclaimed players keep what the club entered.
      fullName: (registered && p.player?.fullName) || p.displayName,
      nickname: registered ? (p.player?.nickname ?? null) : p.nickname,
      clubNickname: registered ? p.nickname?.trim() || null : null,
      // A guest or unclaimed player shows the picture the club set (D-2026-11-09-12).
      picture: registered ? (p.player?.avatarRef ?? null) : p.avatarRef,
      pictureName: registered ? (p.player?.fullName ?? null) : null,
      bannerKey: banner.bannerKey,
      bannerImageUrl: banner.bannerImageUrl,
      identity: registered ? 'registered' : entry || p.player || phone ? 'unclaimed' : 'guest',
      rtrId: registered ? (p.player?.idAllocation?.rtrId ?? null) : (entry?.rtrId ?? null),
      playingLevel: levelCodeFor(p.assessments[0]?.skillLevelId ?? null),
      phoneHidden: registered ? (p.player?.hidePhoneFromClubs ?? false) : false,
      hasPhone: Boolean((registered && p.player?.privateContact?.phoneE164) || phone),
      // #1019: an entry saved with a social link only has no email.
      emailOnFile: Boolean(entry?.email),
      detailsRequired,
      sessionsHere: new Set(p.rosterEntries.map((r) => r.sessionId)).size,
      addedAt: p.addedAt.toISOString(),
    }
  })
}

/**
 * One Player lookup match (Q-ADD-PLAYER › Player Information, D-2026-11-16-04). A registered
 * player with their public card; an unclaimed person with the RTR ID and status only (`fullName`
 * '', no picture or level: no club is shown another club's details) and `ownNameRequired`. Never
 * carries a phone or an email.
 */
export type DirectoryPlayerDto = {
  /** A registered player's id, or an unclaimed person's shared entry id: what the add commands take */
  id: string
  fullName: string
  nickname: string | null
  rtrId: string
  identity: 'registered' | 'unclaimed'
  /** The player's own profile picture (avatar reference), or null for initials */
  picture: string | null
  /** The player's current rank level, or null when they have none yet */
  suggestion: string | null
  phoneHidden: boolean
  ownNameRequired?: boolean
}

export type PlayerLookupDto = { player: DirectoryPlayerDto | null; savedName: string | null }

const NO_MATCH: PlayerLookupDto = { player: null, savedName: null }

/**
 * Player lookup (D-2026-11-16-04): the one ROTRA person whose RTR ID or email is exactly `query`
 * (#1019: or, for an unclaimed person only, whose normalized social link is)
 * (RTR ID uppercased; email trimmed and lowercased), registered or unclaimed. No name search and
 * no phone lookup. When this club already saved them, `savedName` is this club's name for them
 * instead. Players who chose Hide me from Player Information (D-2026-11-12-01) are not found.
 */
export async function lookupPlayer(context: ClubContext, query: string): Promise<PlayerLookupDto> {
  const q = query.trim()
  if (!q) return NO_MATCH
  const rtrId = normalizeRtrId(q)
  const email = rtrId ? null : normalizeEmail(q)
  // #1019: an exact social link finds an unclaimed player only, never a registered one.
  const link = rtrId || email ? null : normalizeSocialLink(q)
  if (!rtrId && !email && !link) return NO_MATCH
  const entry = rtrId
    ? await openEntryByRtrId(prisma, rtrId)
    : email
      ? await openEntryByEmail(prisma, email)
      : link
        ? await openEntryBySocialKey(prisma, link.key)
        : null
  const playerId = entry
    ? null
    : rtrId
      ? ((
          await prisma.playerIdAllocation.findUnique({
            where: { rtrId },
            select: { playerId: true },
          })
        )?.playerId ?? null)
      : email
        ? await registeredPlayerByEmail(prisma, email)
        : null
  if (!entry && !playerId) return NO_MATCH
  const saved = await prisma.clubPlayer.findFirst({
    where: {
      clubId: context.clubId,
      removedAt: null,
      ...(entry ? { sharedEntryId: entry.id, playerId: null } : { playerId }),
    },
    select: { displayName: true, player: { select: { fullName: true, profileState: true } } },
  })
  if (saved)
    return {
      player: null,
      savedName:
        (saved.player?.profileState === 'claimed' && saved.player.fullName) || saved.displayName,
    }
  if (entry)
    return {
      player: {
        id: entry.id,
        fullName: '',
        nickname: null,
        rtrId: entry.rtrId,
        identity: 'unclaimed',
        picture: null,
        suggestion: null,
        phoneHidden: false,
        ownNameRequired: true,
      },
      savedName: null,
    }
  const p = await prisma.player.findFirst({
    where: {
      id: playerId ?? undefined,
      profileState: 'claimed',
      hiddenFromDirectory: false,
      idAllocation: { isNot: null },
    },
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
  if (!p) return NO_MATCH
  return {
    player: {
      id: p.id,
      fullName: p.fullName,
      nickname: p.nickname,
      rtrId: p.idAllocation?.rtrId ?? '',
      identity: 'registered',
      picture: p.avatarRef ?? null,
      suggestion: levelCodeFor(p.rankCurrent?.skillLevelId ?? null),
      phoneHidden: p.hidePhoneFromClubs,
    },
    savedName: null,
  }
}

const alreadySaved = (name: string) =>
  new ServiceError('conflict', { player: `${name} is already in your saved players.` })

/**
 * Saved players › Add player › Player Information: saves a lookup match to the club only, never to
 * a session. `playerId` is a registered player's id or an unclaimed person's shared entry id; for
 * the latter `name` is this club's own name for them (required). A person already saved is
 * refused. A level needs a session to be recorded (`club_assessments`), so none is stored here.
 */
export async function addDirectoryPlayerToClub(
  context: ClubContext,
  input: { operationId: string; playerId: string; name?: string | null },
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
        input.name,
      )
      if (!created) throw alreadySaved(clubPlayer.displayName)
      return { clubPlayerId: clubPlayer.id, name: clubPlayer.displayName }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/**
 * Saved players › Add player › New player, saved to the club only (D-2026-11-16-04): no email saves
 * a guest; an email makes an unclaimed player with an RTR ID, or links the ROTRA player who has it.
 * An email or a phone this club already has for a saved player is refused; same-name guests are
 * never merged. `phone` is E.164 from the Route Handler. `emailWords` says what the email did.
 */
export async function addNewSavedPlayer(
  context: ClubContext,
  input: {
    operationId: string
    name: string
    nickname?: string | null
    phone?: string | null
    email?: string | null
    /** #1019: a social link is an entry key too, and wins over the email */
    socialLink?: string | null
  },
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
      const { clubPlayer, words } = await createClubPlayer(
        tx,
        context,
        input.operationId,
        input,
        new Date(),
      )
      return { clubPlayerId: clubPlayer.id, name: clubPlayer.displayName, emailWords: words }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/**
 * Club nickname sheet › Save nickname (D-2026-11-18-03): sets, changes or clears this club's own
 * nickname for a registered saved player, stored in `club_players.nickname` (no new column). The
 * reply's `message` is the mock's toast: "Club nickname saved · NAME", "Club nickname removed ·
 * NAME" or "No club nickname · NAME", NAME being the player's full name.
 */
export async function setClubNickname(
  context: ClubContext,
  input: { clubPlayerId: string; clubNickname: string },
) {
  await requireClubEntitlement(context)
  if (!UUID.test(input.clubPlayerId)) throw new ServiceError('not_found')
  const next = input.clubNickname.trim()
  return prisma.$transaction(async (tx) => {
    const row = await tx.clubPlayer.findFirst({
      where: { id: input.clubPlayerId, clubId: context.clubId, removedAt: null },
      select: {
        id: true,
        nickname: true,
        player: { select: { fullName: true, profileState: true } },
      },
    })
    if (!row) throw new ServiceError('not_found', { player: 'Player not available.' })
    if (row.player?.profileState !== 'claimed')
      throw new ServiceError('forbidden', {
        player: 'Only a registered player has a club nickname.',
      })
    const had = Boolean(row.nickname?.trim())
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: context.clubId, id: row.id } },
      data: { nickname: next || null, revision: { increment: 1 } },
    })
    const name = row.player.fullName
    return {
      clubPlayerId: row.id,
      clubNickname: next || null,
      message: next
        ? `Club nickname saved · ${name}`
        : had
          ? `Club nickname removed · ${name}`
          : `No club nickname · ${name}`,
    }
  })
}

/**
 * Stats · YEAR on the Queue Master's player profile dialog (2026-11-13-queue-profile-stats-banner):
 * the linked ROTRA player's official games this calendar year, the same numbers as the session
 * page's participant card. Guests and unclaimed records have no ROTRA history yet: null
 * (“No games yet this year”). A player who turned off Show my profile stats reads `{ hidden: true }`
 * (the Queue Master is not exempt; 2026-11-13-player-stats-visibility). A player the club hasn't saved (or removed) is not found.
 */
export async function readClubPlayerYearStats(
  context: ClubContext,
  clubPlayerId: string,
): Promise<ParticipantStatsRead> {
  if (!UUID.test(clubPlayerId)) throw new ServiceError('not_found')
  const row = await prisma.clubPlayer.findFirst({
    where: { id: clubPlayerId, clubId: context.clubId, removedAt: null },
    select: { playerId: true, player: { select: { profileState: true, showProfileStats: true } } },
  })
  if (!row) throw new ServiceError('not_found')
  if (!row.playerId || row.player?.profileState !== 'claimed') return null
  // Show my profile stats off: hidden from the Queue Master too (nothing but the marker leaves).
  if (row.player?.showProfileStats === false) return { hidden: true }
  const stats = yearGameStats(await readPlayerMatchHistory(row.playerId), Date.now())
  if (!stats) return null
  // Allowlisted fields only.
  return { games: stats.games, wins: stats.wins, losses: stats.losses, winRate: stats.winRate }
}
