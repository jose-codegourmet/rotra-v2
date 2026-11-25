import 'server-only'
import { deriveAccountVerification } from '@rotra/data/account-verification/rules'
import { levelBandOf } from '@rotra/data/admin-player/management-rules'
import { createdOnFromRtrId } from '@rotra/data/admin-player/rules'
import type { AdminPlayer, AdminPlayerVerification } from '@rotra/data/admin-player/types'
import type { PlayerSessionRecord } from '@rotra/data/player/types'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { currentExperienceMonths, playingStyle } from '../player/profile'
import { readClubPlayerMatchHistory, readPlayerMatchHistory } from '../player/projections'
import { requireAdmin, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type AdminPlayerRow = Omit<AdminPlayer, 'revision'> & { revision: string }

/**
 * A-PLAYERS rows for unclaimed people saved with an email (D-2026-11-16-04, P15.8): one row per
 * open shared entry, its `id` the entry id, with the RTR ID, the email (Admin only) and every club
 * that saved them (`savedAs`: each club's own name, when more than one club did). The name and
 * nickname shown are the first club's. Never a guest.
 */
async function readSharedEntryRows(id?: string): Promise<AdminPlayerRow[]> {
  const entries = await prisma.sharedPlayerEntry.findMany({
    where: { claimedPlayerId: null, retiredAt: null, ...(id ? { id } : {}) },
    orderBy: [{ allocatedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      email: true,
      rtrId: true,
      creatingClubId: true,
      cityCode: true,
      revision: true,
      location: { select: { displayName: true } },
      clubPlayers: {
        where: { removedAt: null, playerId: null },
        orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
        select: {
          clubId: true,
          displayName: true,
          nickname: true,
          addedAt: true,
          club: { select: { name: true } },
          privateInput: { select: { phoneE164: true } },
        },
      },
    },
  })
  return entries.flatMap((entry) => {
    const first = entry.clubPlayers[0]
    if (!first) return []
    const createdOn = createdOnFromRtrId(entry.rtrId)
    const several = entry.clubPlayers.length > 1
    return [
      {
        id: entry.id,
        name: first.displayName,
        nickname: entry.clubPlayers.find((p) => p.nickname)?.nickname ?? null,
        rtrId: entry.rtrId,
        createdByClubId: entry.creatingClubId,
        createdOn,
        addedOn: createdOn,
        picture: null,
        registeredPlace: { code: entry.cityCode, name: entry.location.displayName },
        phone:
          entry.clubPlayers.find((p) => p.privateInput?.phoneE164)?.privateInput?.phoneE164 ??
          undefined,
        email: entry.email ?? undefined,
        phoneHidden: false,
        claimed: false,
        detailsRequired: false,
        registeredOn: undefined,
        clubs: entry.clubPlayers.map((p) => ({
          clubId: p.clubId,
          name: p.club.name,
          addedAt: p.addedAt.getTime(),
          ...(several ? { savedAs: p.displayName } : {}),
          identity: 'unclaimed' as const,
        })),
        levelIndex: null,
        levelBand: null,
        recentStandardMatches: 0,
        rankStatus: { kind: 'none' as const, text: 'No rank yet' },
        archivedAt: null,
        revision: entry.revision.toString(),
        removalReason: 'Saved by its club only; the club manages this record',
        verification: null,
      },
    ]
  })
}

/**
 * A-PLAYERS rows for the clubs' older unclaimed records: a `club_players` row with a phone, no
 * email (no shared entry) and no global player, listed under its club as "Not registered yet" with
 * no RTR ID and **Details required** (D-2026-11-16-04: the club adds an email or deletes it). Its
 * `id` is the club player id; the place is the club's founding location. Never a guest (no phone).
 */
async function readClubOnlyRecords(id?: string): Promise<AdminPlayerRow[]> {
  const records = await prisma.clubPlayer.findMany({
    where: {
      playerId: null,
      sharedEntryId: null,
      removedAt: null,
      privateInput: { phoneE164: { not: null } },
      ...(id ? { id } : {}),
    },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      clubId: true,
      displayName: true,
      nickname: true,
      addedAt: true,
      revision: true,
      privateInput: { select: { phoneE164: true, email: true } },
      club: {
        select: {
          name: true,
          foundingLocation: { select: { cityCode: true, displayName: true } },
        },
      },
    },
  })
  return records.map((record) => {
    const addedOn = record.addedAt.toISOString().slice(0, 10)
    return {
      id: record.id,
      name: record.displayName,
      nickname: record.nickname,
      rtrId: null,
      createdByClubId: record.clubId,
      createdOn: addedOn,
      addedOn,
      picture: null,
      registeredPlace: {
        code: record.club.foundingLocation.cityCode,
        name: record.club.foundingLocation.displayName,
      },
      phone: record.privateInput?.phoneE164 ?? undefined,
      email: record.privateInput?.email ?? undefined,
      phoneHidden: false,
      claimed: false,
      detailsRequired: true,
      registeredOn: undefined,
      clubs: [
        {
          clubId: record.clubId,
          name: record.club.name,
          addedAt: record.addedAt.getTime(),
          identity: 'unclaimed' as const,
        },
      ],
      levelIndex: null,
      levelBand: null,
      recentStandardMatches: 0,
      rankStatus: { kind: 'none' as const, text: 'No rank yet' },
      archivedAt: null,
      revision: record.revision.toString(),
      removalReason: 'Saved by its club only; the club manages this record',
      verification: null,
    }
  })
}

/**
 * D-2026-11-23-07: the derived status only. A pending email change doesn't change whether the
 * player is verified, so the requests are left out here; the Verification card reads them.
 */
function verificationOf(
  player: {
    id: string
    verificationOverride: string | null
    account: { googleEmail: string | null } | null
    privateContact: { email: string | null; phoneE164: string | null } | null
  },
  claimed: boolean,
): AdminPlayerVerification | null {
  if (!claimed || !player.account) return null
  const v = deriveAccountVerification(
    {
      playerId: player.id,
      googleEmail: player.account.googleEmail,
      email: player.privateContact?.email ?? '',
      phone: player.privateContact?.phoneE164 ?? '',
    },
    [],
    player.verificationOverride === 'verified',
  )
  return {
    verified: v.verified,
    verifiedByAdmin: v.verifiedByAdmin,
    completedSteps: v.completedSteps,
  }
}

/**
 * A-PLAYERS: explicitly allowlisted owner-only projection of allocated player identities, followed
 * by the clubs' unclaimed records (no RTR ID). `playerId` is a player id or a club player id.
 */
export async function readAdminPlayerDirectory(
  context: AdminContext,
  playerId?: string,
): Promise<AdminPlayerRow[]> {
  requireAdmin(context)
  const players = await prisma.player.findMany({
    where: { idAllocation: { isNot: null }, ...(playerId ? { id: playerId } : {}) },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      gender: true,
      avatarRef: true,
      profileState: true,
      hidePhoneFromClubs: true,
      archivedAt: true,
      revision: true,
      privateContact: { select: { phoneE164: true, email: true } },
      verificationOverride: true,
      account: { select: { claimedAt: true, googleEmail: true } },
      idAllocation: {
        select: {
          rtrId: true,
          creatingClubId: true,
          cityCode: true,
          location: { select: { displayName: true } },
        },
      },
      clubPlayers: {
        orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
        select: { clubId: true, nickname: true, addedAt: true, club: { select: { name: true } } },
      },
      rankCurrent: {
        select: {
          recentStandardMatchCount: true,
          leaderboardEligible: true,
          skillLevel: { select: { displayOrder: true, label: true } },
          policyVersion: { select: { recentStandardMatchThreshold: true } },
        },
      },
    },
  })
  const shared = await readSharedEntryRows(playerId)
  const clubOnly = await readClubOnlyRecords(playerId)
  // A registration in progress copies an open entry's RTR ID (D-2026-11-16-04); the entry's row
  // stands for the person until the registration completes.
  const openRtrIds = new Set(shared.map((row) => row.rtrId))
  const rows = players.flatMap((player) => {
    const allocation = player.idAllocation
    if (!allocation) return []
    if (player.profileState !== 'claimed' && openRtrIds.has(allocation.rtrId)) return []
    const rank = player.rankCurrent
    const level = rank?.skillLevel
    const levelIndex = level?.displayOrder ?? null
    const recentStandardMatches = rank?.recentStandardMatchCount ?? 0
    const claimed = player.profileState === 'claimed'
    const createdOn = createdOnFromRtrId(allocation.rtrId)
    return [
      {
        id: player.id,
        name: player.fullName,
        nickname: player.nickname ?? player.clubPlayers.find((p) => p.nickname)?.nickname ?? null,
        // D-2026-11-19-01: public, set by the player; read-only for Admin. Null = Not added yet.
        gender: player.gender,
        rtrId: allocation.rtrId,
        createdByClubId: allocation.creatingClubId,
        createdOn,
        addedOn: createdOn,
        picture: player.avatarRef,
        registeredPlace: { code: allocation.cityCode, name: allocation.location.displayName },
        phone: player.privateContact?.phoneE164,
        email: player.privateContact?.email ?? undefined,
        phoneHidden: player.hidePhoneFromClubs,
        claimed,
        registeredOn: player.account?.claimedAt.toISOString().slice(0, 10),
        clubs: player.clubPlayers.map((p) => ({
          clubId: p.clubId,
          name: p.club.name,
          addedAt: p.addedAt.getTime(),
          identity: claimed ? ('registered' as const) : ('unclaimed' as const),
        })),
        levelIndex,
        levelBand: levelBandOf(levelIndex),
        recentStandardMatches,
        // Read the stored projection; a match count alone cannot establish leaderboard eligibility.
        rankStatus:
          !level || !rank
            ? { kind: 'none' as const, text: 'No rank yet' }
            : rank.leaderboardEligible
              ? { kind: 'board' as const, text: `${level.label} · on the overall leaderboard` }
              : {
                  kind: 'below' as const,
                  text: `${level.label} · ${recentStandardMatches} of ${rank.policyVersion.recentStandardMatchThreshold} recent matches`,
                },
        archivedAt: player.archivedAt?.toISOString() ?? null,
        revision: player.revision.toString(),
        removalReason: "This part of ROTRA isn't connected to saved data yet.",
        verification: verificationOf(player, claimed),
      },
    ]
  })
  return [...rows, ...shared, ...clubOnly]
}

/** Current edit values, behind the same Admin boundary as the directory. */
export async function readAdminPlayerEdit(context: AdminContext, playerId: string) {
  requireAdmin(context)
  const [row] = await readAdminPlayerDirectory(context, playerId)
  if (!row) throw new ServiceError('not_found')
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      avatarPreviousRef: true,
      fullName: true,
      nickname: true,
      personalDetails: true,
      experienceMonths: true,
      experienceRecordedAt: true,
      profileVisibility: true,
      showProfileStats: true,
      privateContact: { select: { playerId: true } },
      socialLinks: { select: { provider: true, url: true } },
    },
  })
  const months = player
    ? currentExperienceMonths(player.experienceMonths, player.experienceRecordedAt)
    : null
  const socialLinks = { facebook: '', instagram: '', youtube: '', linkedin: '' }
  for (const link of player?.socialLinks ?? []) socialLinks[link.provider] = link.url
  const passwordEvent = await prisma.adminAuditEvent.findFirst({
    where: { targetType: 'player', targetId: playerId, action: 'player.password_set' },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: { occurredAt: true },
  })
  return {
    ...row,
    name: player?.fullName ?? row.name,
    nickname: player ? player.nickname : row.nickname,
    playingStyle: player ? playingStyle(player.personalDetails) : '',
    experienceYears: months == null ? null : Math.floor(months / 12),
    experienceMonths: months == null ? null : months % 12,
    socialLinks,
    profilePrivate: player ? player.profileVisibility !== 'public' : false,
    /** Show my profile stats (2026-11-13-player-stats-visibility); a club-only record has no setting. */
    showProfileStats: player ? player.showProfileStats : true,
    previousPicture: player?.avatarPreviousRef ?? null,
    hasAccount: Boolean(player?.privateContact) || !player,
    passwordSetAt: passwordEvent?.occurredAt.toISOString() ?? null,
  }
}

/** Reuses the canonical read-only history projection, behind the Admin account boundary. */
export async function readAdminPlayerGames(
  context: AdminContext,
  playerId: string,
): Promise<PlayerSessionRecord[]> {
  requireAdmin(context)
  if (!UUID.test(playerId)) throw new ServiceError('not_found')
  const player = await prisma.playerIdAllocation.findUnique({
    where: { playerId },
    select: { playerId: true },
  })
  let sessions: Awaited<ReturnType<typeof readPlayerMatchHistory>>
  // Admin sees every name, as on its other player reads; public reads mask always-private players.
  if (player) sessions = await readPlayerMatchHistory(playerId, { maskAlwaysPrivate: false })
  else {
    // An unclaimed person's shared entry: the games of every club record pointing to it.
    const records = await prisma.clubPlayer.findMany({
      where: { sharedEntryId: playerId, playerId: null },
      select: { id: true, clubId: true },
    })
    if (records.length) {
      sessions = []
      for (const record of records)
        sessions.push(...(await readClubPlayerMatchHistory(record.clubId, record.id)))
    } else {
      const [clubOnly] = await readClubOnlyRecords(playerId)
      if (!clubOnly?.createdByClubId) throw new ServiceError('not_found')
      sessions = await readClubPlayerMatchHistory(clubOnly.createdByClubId, playerId)
    }
  }
  return sessions.flatMap((s) =>
    s.finishedAt
      ? [
          {
            ...s,
            finishedAt: s.finishedAt,
            games: s.games.map((g) => ({
              ...g,
              counting: g.counting as 'counted' | 'fun' | 'partial' | 'not_ranked',
              result: g.result as 'won' | 'lost',
            })),
          },
        ]
      : [],
  )
}

/**
 * A-PLAYER Edit profile: full name and nickname under the loaded revision, with a reason. The global
 * identity only: `club_players.display_name` is the club's own copy (clubs edit it) and the rank
 * projection stores no name, so neither is rewritten. `avatar_ref` holds an uploaded photo
 * reference, never a URL, so a changed photo link is refused rather than saved.
 */
export async function updateAdminPlayerProfile(
  context: AdminContext,
  input: {
    playerId: string
    expectedRevision: string
    name: string
    nickname: string
    picture: string
    reason: string
  },
) {
  requireAdmin(context)
  if (!UUID.test(input.playerId)) throw new ServiceError('not_found')
  const name = input.name.trim()
  const nickname = input.nickname.trim() || null
  const reason = input.reason.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter a name.' })
  if (!reason) throw new ServiceError('invalid', { reason: 'Enter a reason.' })
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "players" WHERE "id" = ${input.playerId}::uuid FOR UPDATE`
    if (!rows.length) throw new ServiceError('not_found')
    const player = await tx.player.findUniqueOrThrow({
      where: { id: input.playerId },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        avatarRef: true,
        profileState: true,
        revision: true,
        idAllocation: { select: { playerId: true } },
      },
    })
    if (!player.idAllocation) throw new ServiceError('not_found')
    requireRevision(player.revision, input.expectedRevision)
    // An empty picture keeps the current photo; only a different link is refused.
    const picture = input.picture.trim()
    if (picture && picture !== (player.avatarRef ?? ''))
      throw new ServiceError('invalid', {
        picture:
          player.profileState === 'claimed'
            ? 'Photos for registered players cannot be edited by Admin.'
            : "Photo links can't be saved yet.",
      })
    await tx.player.update({
      where: { id: player.id },
      data: { fullName: name, nickname, revision: { increment: 1 } },
    })
    await recordAudit(tx, context, {
      action: 'player.profile_updated',
      targetType: 'player',
      targetId: player.id,
      metadata: {
        before: { name: player.fullName, nickname: player.nickname },
        after: { name, nickname },
        reason,
      },
    })
  })
  const [player] = await readAdminPlayerDirectory(context, input.playerId)
  if (!player) throw new ServiceError('not_found')
  return player
}

const NO_STORED_GENDER =
  "This record is saved by its club only. Its gender isn't connected to saved data yet."

/**
 * Admin Players › Set gender (owner, November 25, 2026, D-2026-11-19-01): sets or clears (null) the
 * gender of every selected allocated player, registered or not, one transaction and one audit event
 * per player. The same value again is not a write. A club-only record or a shared entry has no
 * gender column yet, so that player reports a failure instead of an invented save. The player's
 * revision moves so an open Edit profile reloads before it saves over the change.
 */
export async function setAdminPlayersGender(
  context: AdminContext,
  input: { ids: string[]; gender: 'male' | 'female' | null },
): Promise<{ id: string; name: string; success: boolean; error?: string }[]> {
  requireAdmin(context)
  if (input.gender !== null && input.gender !== 'male' && input.gender !== 'female')
    throw new ServiceError('invalid', { gender: 'Choose Male, Female or Not given.' })
  const results: { id: string; name: string; success: boolean; error?: string }[] = []
  for (const id of [...new Set(input.ids)]) {
    if (!UUID.test(id)) {
      results.push({ id, name: id, success: false, error: 'Player not found. Reload the list.' })
      continue
    }
    try {
      const name = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "players" WHERE "id" = ${id}::uuid FOR UPDATE`
        if (!rows.length) return null
        const player = await tx.player.findUniqueOrThrow({
          where: { id },
          select: { fullName: true, gender: true, idAllocation: { select: { playerId: true } } },
        })
        if (!player.idAllocation) return null
        if (player.gender !== input.gender) {
          await tx.player.update({
            where: { id },
            data: { gender: input.gender, revision: { increment: 1 } },
          })
          await recordAudit(tx, context, {
            action: 'player.gender_set',
            targetType: 'player',
            targetId: id,
            metadata: { name: player.fullName, before: player.gender, gender: input.gender },
          })
        }
        return player.fullName
      })
      if (name === null) {
        const entry = await prisma.sharedPlayerEntry.findUnique({
          where: { id },
          select: { id: true },
        })
        const clubOnly = entry
          ? null
          : await prisma.clubPlayer.findUnique({ where: { id }, select: { id: true } })
        results.push(
          entry || clubOnly
            ? { id, name: id, success: false, error: NO_STORED_GENDER }
            : { id, name: id, success: false, error: 'Player not found. Reload the list.' },
        )
      } else results.push({ id, name, success: true })
    } catch {
      results.push({ id, name: id, success: false, error: 'Could not save.' })
    }
  }
  return results
}

const CLUB_ONLY_ARCHIVE =
  "This record is saved by its club only. Archiving it isn't connected to saved data yet."

/**
 * Admin Players › Archive / Restore (owner, November 25, 2026): reason required, one transaction and
 * one audit event per player. Archive hides the player from club pickers and directories; sign-in
 * and history stay. Archiving an archived player (or restoring an active one) is not a write. A
 * club-only record or a shared entry has no archive column yet, so it reports a failure.
 */
export async function setAdminPlayersArchived(
  context: AdminContext,
  input: { ids: string[]; action: 'archive' | 'restore'; reason: string },
): Promise<{ id: string; name: string; success: boolean; error?: string }[]> {
  requireAdmin(context)
  const reason = input.reason.trim()
  if (!reason) throw new ServiceError('invalid', { reason: 'Add a reason.' })
  const archive = input.action === 'archive'
  const results: { id: string; name: string; success: boolean; error?: string }[] = []
  for (const id of [...new Set(input.ids)]) {
    if (!UUID.test(id)) {
      results.push({ id, name: id, success: false, error: 'Player not found. Reload the list.' })
      continue
    }
    try {
      const name = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "players" WHERE "id" = ${id}::uuid FOR UPDATE`
        if (!rows.length) return null
        const player = await tx.player.findUniqueOrThrow({
          where: { id },
          select: {
            fullName: true,
            archivedAt: true,
            idAllocation: { select: { rtrId: true } },
          },
        })
        if (!player.idAllocation) return null
        if (!!player.archivedAt !== archive) {
          await tx.player.update({
            where: { id },
            data: { archivedAt: archive ? new Date() : null, revision: { increment: 1 } },
          })
          await recordAudit(tx, context, {
            action: archive ? 'player.archived' : 'player.restored',
            targetType: 'player',
            targetId: id,
            metadata: { name: player.fullName, rtrId: player.idAllocation.rtrId, reason },
          })
        }
        return player.fullName
      })
      if (name === null) {
        const entry = await prisma.sharedPlayerEntry.findUnique({
          where: { id },
          select: { id: true },
        })
        const clubOnly = entry
          ? null
          : await prisma.clubPlayer.findUnique({ where: { id }, select: { id: true } })
        results.push(
          entry || clubOnly
            ? { id, name: id, success: false, error: CLUB_ONLY_ARCHIVE }
            : { id, name: id, success: false, error: 'Player not found. Reload the list.' },
        )
      } else results.push({ id, name, success: true })
    } catch {
      results.push({ id, name: id, success: false, error: 'Could not save.' })
    }
  }
  return results
}
