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
  | { state: 'resolved'; playerId: string; rtrId: string; created: boolean }
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
async function allocateRtrId(tx: Tx, playerId: string, clubId: string, at: Date) {
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
 * Resolves one club player's private phone intake to a global player, once the entry has synced
 * (owner decision 2026-10-28) and before Session done. The same phone always maps to one player and
 * one RTR ID: creation for a phone is serialized by an advisory lock, and the unique phone
 * constraint is the backstop. A unique race retries from resolution and never publishes the losing
 * allocation. Identity creation grants no match credit.
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
      return {
        state: 'resolved',
        playerId: clubPlayer.playerId,
        rtrId: allocation.rtrId,
        created: false,
      }
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
    select: { playerId: true },
  })
  let playerId: string
  let rtrId: string
  let created = false
  if (known) {
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
    playerId = known.playerId
    const allocation = await tx.playerIdAllocation.findUnique({ where: { playerId } })
    rtrId = allocation ? allocation.rtrId : await allocateRtrId(tx, playerId, context.clubId, now)
  } else {
    const player = await tx.player.create({
      data: { fullName: clubPlayer.displayName, nickname: clubPlayer.nickname },
    })
    await tx.playerPrivateContact.create({
      data: { playerId: player.id, phoneE164: intake.phoneE164 },
    })
    playerId = player.id
    rtrId = await allocateRtrId(tx, playerId, context.clubId, now)
    created = true
  }
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
  return { state: 'resolved', playerId, rtrId, created }
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
