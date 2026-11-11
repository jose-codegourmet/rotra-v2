import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { formatRtrId, nextPlayerSequence, rtrSyncDate } from './rtr-id'

type Tx = Prisma.TransactionClient

const E164 = /^\+[1-9][0-9]{7,14}$/
const MAX_RACE_RETRIES = 3

export type IdentityResolution =
  | { state: 'resolved'; playerId: string; rtrId: string }
  /** The phone matched no registered player: the record stays the club's unclaimed profile. */
  | { state: 'unclaimed' }
  | { state: 'pending' }
  | { state: 'conflicted' }
  | { state: 'guest' }

const isUniqueRace = (error: unknown) =>
  (error as { code?: string })?.code === 'P2002' ||
  (error as { meta?: { code?: string } })?.meta?.code === '23505'

/** Takes a transaction-scoped advisory lock on a phone, serializing creation for the same number. */
async function lockPhone(tx: Tx, phoneE164: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`phone:${phoneE164}`}))`
}

/**
 * Allocates the permanent RTR ID for a new player in the caller's transaction: one atomic counter
 * step for the creating club's founding city and sync day, then the immutable allocation row.
 */
export async function allocateRtrId(tx: Tx, playerId: string, clubId: string, at: Date) {
  const club = await tx.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { foundingLocation: true },
  })
  const location = club.foundingLocation
  const syncDate = rtrSyncDate(at)
  const sequence = await nextPlayerSequence(tx, location.id, syncDate)
  const rtrId = formatRtrId(location.countryCode, location.cityCode, syncDate, sequence)
  await tx.playerIdAllocation.create({
    data: {
      playerId,
      rtrId,
      creatingClubId: clubId,
      locationCodeId: location.id,
      countryCode: location.countryCode,
      cityCode: location.cityCode,
      syncDate: new Date(`${syncDate}T00:00:00Z`),
      sequence,
    },
  })
  return rtrId
}

/**
 * Links every club's unclaimed record whose private phone is `phoneE164` to the player who just
 * registered with that phone (D-2026-11-11-03: automatic, no Queue Master tap). One record per club
 * (the earliest saved); a club that already lists the player keeps that row. Game history stays on
 * the club records (`club_player_id`); no attribution or permanent result is written here.
 */
export async function linkClubRecordsByPhone(
  tx: Tx,
  playerId: string,
  phoneE164: string,
  now: Date,
) {
  const records = await tx.clubPlayer.findMany({
    where: {
      playerId: null,
      removedAt: null,
      privateInput: { phoneE164, state: { in: ['pending', 'conflicted'] } },
    },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: { id: true, clubId: true },
  })
  const linked: { clubId: string; clubPlayerId: string }[] = []
  for (const record of records) {
    if (linked.some((l) => l.clubId === record.clubId)) continue
    const existing = await tx.clubPlayer.findUnique({
      where: { clubId_playerId: { clubId: record.clubId, playerId } },
      select: { id: true },
    })
    if (existing) continue
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: record.clubId, id: record.id } },
      data: { playerId, revision: { increment: 1 } },
    })
    await tx.clubPlayerPrivateInput.update({
      where: { clubPlayerId: record.id },
      data: {
        state: 'resolved',
        resolvedPlayerId: playerId,
        resolvedAt: now,
        revision: { increment: 1 },
      },
    })
    linked.push({ clubId: record.clubId, clubPlayerId: record.id })
  }
  return linked
}

/**
 * Resolves one club player's private phone intake once the entry has synced (owner decision
 * 2026-10-28) and before Session done. Since D-2026-11-11-03 the lookup only **links**: a phone that
 * belongs to a registered (claimed) player links the record to that player; any other phone leaves
 * the record as the club's own unclaimed profile, with no `players` row and no RTR ID (both come
 * with registration). Linking grants no match credit.
 */
export async function resolveClubPlayerIdentity(
  context: ClubContext,
  clubPlayerId: string,
): Promise<IdentityResolution> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => resolveOnce(tx, context, clubPlayerId))
    } catch (error) {
      if (isUniqueRace(error) && attempt < MAX_RACE_RETRIES) continue
      if (isUniqueRace(error)) throw new ServiceError('conflict')
      throw error
    }
  }
}

async function resolveOnce(
  tx: Tx,
  context: ClubContext,
  clubPlayerId: string,
): Promise<IdentityResolution> {
  const clubPlayer = await tx.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    include: { privateInput: true },
  })
  if (!clubPlayer) throw new ServiceError('not_found')
  if (clubPlayer.playerId) {
    const allocation = await tx.playerIdAllocation.findUnique({
      where: { playerId: clubPlayer.playerId },
    })
    if (allocation)
      return { state: 'resolved', playerId: clubPlayer.playerId, rtrId: allocation.rtrId }
  }
  const intake = clubPlayer.privateInput
  if (!intake?.phoneE164) return { state: 'guest' }
  if (intake.state === 'conflicted') return { state: 'conflicted' }
  if (intake.state === 'discarded') return { state: 'guest' }
  if (!E164.test(intake.phoneE164)) {
    await tx.clubPlayerPrivateInput.update({
      where: { clubPlayerId },
      data: { state: 'conflicted', revision: { increment: 1 } },
    })
    return { state: 'conflicted' }
  }
  await lockPhone(tx, intake.phoneE164)
  const now = new Date()
  const known = await tx.playerPrivateContact.findUnique({
    where: { phoneE164: intake.phoneE164 },
    select: { playerId: true, player: { select: { profileState: true } } },
  })
  // Only a registered player links; an unregistered phone stays the club's own record.
  if (!known || known.player.profileState !== 'claimed') return { state: 'unclaimed' }
  // The club already saved this person under another club-player row: keep both pending review.
  const linked = await tx.clubPlayer.findUnique({
    where: { clubId_playerId: { clubId: context.clubId, playerId: known.playerId } },
    select: { id: true },
  })
  if (linked && linked.id !== clubPlayerId) {
    await tx.clubPlayerPrivateInput.update({
      where: { clubPlayerId },
      data: { state: 'conflicted', revision: { increment: 1 } },
    })
    return { state: 'conflicted' }
  }
  const playerId = known.playerId
  const allocation = await tx.playerIdAllocation.findUnique({ where: { playerId } })
  // A registered player always has an RTR ID (allocated at registration); a missing one is repaired.
  const rtrId = allocation
    ? allocation.rtrId
    : await allocateRtrId(tx, playerId, context.clubId, now)
  await tx.clubPlayer.update({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    data: { playerId, revision: { increment: 1 } },
  })
  await tx.clubPlayerPrivateInput.update({
    where: { clubPlayerId },
    data: {
      state: 'resolved',
      resolvedPlayerId: playerId,
      resolvedAt: now,
      revision: { increment: 1 },
    },
  })
  return { state: 'resolved', playerId, rtrId }
}

/** Resolves every pending intake on a session's roster; called after its entries sync. */
export async function resolveSessionIdentities(context: ClubContext, sessionId: string) {
  const entries = await prisma.sessionPlayer.findMany({
    where: { clubId: context.clubId, sessionId },
    select: { clubPlayerId: true },
  })
  const pending = await prisma.clubPlayerPrivateInput.findMany({
    where: {
      clubId: context.clubId,
      clubPlayerId: { in: entries.map((e) => e.clubPlayerId) },
      state: 'pending',
    },
    select: { clubPlayerId: true },
  })
  const results: Record<string, IdentityResolution['state']> = {}
  for (const { clubPlayerId } of pending)
    results[clubPlayerId] = (await resolveClubPlayerIdentity(context, clubPlayerId)).state
  return results
}
