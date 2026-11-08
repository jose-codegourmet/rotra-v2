import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import type { AccountContext } from '../auth/account-context'
import { AUTH_PROVIDER } from '../auth/supabase'
import { generatePlayerRecoveryToken } from '../auth/supabase-provider-admin'
import { prisma } from '../client/prisma'
import { Prisma } from '../generated/prisma/client'
import { requireAdmin } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INVALID_LINK = 'This reset link has expired or was already used.'
const digest = (token: string) => createHash('sha256').update(token).digest()
const playerSelect = {
  id: true,
  fullName: true,
  idAllocation: { select: { rtrId: true } },
  privateContact: { select: { email: true } },
  account: {
    select: { authSubject: true, authProvider: true, disabledAt: true, contactSyncStatus: true },
  },
} satisfies Prisma.PlayerSelect

type ResetPlayer = Prisma.PlayerGetPayload<{ select: typeof playerSelect }>
function eligible(player: ResetPlayer | null, email: string) {
  return !!(
    player?.account &&
    !player.account.disabledAt &&
    player.account.authProvider === AUTH_PROVIDER &&
    player.account.contactSyncStatus === 'in_sync' &&
    player.privateContact?.email === email
  )
}

/** Generic acknowledgement; no provider calls, emails, account details or request IDs returned. */
export async function submitPasswordResetRequest(email: string) {
  const address = email.trim().toLowerCase()
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    throw new ServiceError('invalid', { email: 'Enter an email address, like name@example.com.' })
  const contact = await prisma.playerPrivateContact.findUnique({
    where: { email: address },
    select: { player: { select: playerSelect } },
  })
  try {
    await prisma.playerPasswordResetRequest.create({
      data: {
        email: address,
        playerId: contact && eligible(contact.player, address) ? contact.player.id : null,
      },
    })
  } catch (error) {
    // The partial unique index makes simultaneous/repeated pending requests idempotent.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
      throw error
  }
  return { acknowledged: true }
}

export async function readPasswordResetRequests(context: AccountContext, page = 1) {
  requireAdmin(context)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new ServiceError('invalid')
  const [total, rows] = await prisma.$transaction([
    prisma.playerPasswordResetRequest.count(),
    prisma.playerPasswordResetRequest.findMany({
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 25,
      take: 25,
      select: {
        id: true,
        email: true,
        status: true,
        requestedAt: true,
        reviewedAt: true,
        reviewedBy: { select: { displayName: true } },
        player: { select: playerSelect },
      },
    }),
  ])
  return {
    total,
    page,
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      requestedAt: row.requestedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewedBy: row.reviewedBy?.displayName ?? null,
      playerId: row.player?.id ?? null,
      playerName: row.player?.fullName ?? null,
      rtrId: row.player?.idAllocation?.rtrId ?? null,
      canIssue: eligible(row.player, row.email),
    })),
  }
}

/** A short issuance lease serializes provider calls without holding a DB transaction open. */
export async function reviewPasswordResetRequest(
  context: AccountContext,
  id: string,
  input: { action: string; ownershipVerified: boolean },
) {
  const admin = requireAdmin(context)
  if (!UUID.test(id) || !['issue', 'decline'].includes(input.action))
    throw new ServiceError('invalid')
  if (input.action === 'issue' && input.ownershipVerified !== true)
    throw new ServiceError('invalid', {
      ownership: 'Verify account ownership before generating a link.',
    })
  const issuanceId = randomUUID()
  const prepared = await prisma.$transaction(async (tx) => {
    const initial = await tx.playerPasswordResetRequest.findUnique({
      where: { id },
      select: { playerId: true },
    })
    if (!initial) throw new ServiceError('not_found')
    if (initial.playerId)
      await tx.$queryRaw`SELECT id FROM players WHERE id = ${initial.playerId}::uuid FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM player_password_reset_requests WHERE id = ${id}::uuid FOR UPDATE`
    const request = await tx.playerPasswordResetRequest.findUniqueOrThrow({
      where: { id },
      include: { player: { select: playerSelect } },
    })
    if (
      request.status === 'declined' ||
      (input.action === 'decline' && request.status !== 'pending')
    )
      throw new ServiceError('conflict')
    const now = new Date()
    const busy = await tx.playerPasswordResetRequest.findFirst({
      where: {
        ...(request.playerId ? { playerId: request.playerId } : { id }),
        issuanceStartedAt: { gt: new Date(now.getTime() - 60000) },
      },
      select: { id: true },
    })
    if (busy)
      throw new ServiceError('conflict', {
        link: 'A reset link is being generated. Wait a minute before trying again.',
      })
    if (input.action === 'decline') {
      await tx.playerPasswordResetRequest.update({
        where: { id },
        data: {
          status: 'declined',
          reviewedByAdminId: admin.adminId,
          reviewedAt: now,
          issuanceId: null,
          issuanceStartedAt: null,
          revision: { increment: 1 },
        },
      })
      await recordAudit(tx, admin, {
        action: 'player.password_reset_declined',
        targetType: 'password_reset_request',
        targetId: id,
      })
      return null
    }
    const player = request.player
    if (!eligible(player, request.email) || !player?.account)
      throw new ServiceError('conflict', {
        account:
          'This account is unavailable or its email changed. Ask the player to submit a new request with their current email.',
      })
    // Revoke earlier ROTRA links and any abandoned issuance lease before reserving this one.
    await tx.playerPasswordResetRequest.updateMany({
      where: { playerId: player.id },
      data: {
        tokenDigest: null,
        issuanceId: null,
        issuanceStartedAt: null,
        revision: { increment: 1 },
      },
    })
    await tx.playerPasswordResetRequest.update({
      where: { id },
      data: { issuanceId, issuanceStartedAt: now },
    })
    return { playerId: player.id, authSubject: player.account.authSubject, email: request.email }
  })
  if (!prepared) return { token: null }
  let token: string
  try {
    token = await generatePlayerRecoveryToken(prepared.authSubject, prepared.email)
  } catch {
    await prisma.playerPasswordResetRequest.updateMany({
      where: { id, issuanceId },
      data: { issuanceId: null, issuanceStartedAt: null, revision: { increment: 1 } },
    })
    throw new ServiceError('unavailable', {
      link: "Couldn't generate a reset link. Check the account and try again.",
    })
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM players WHERE id = ${prepared.playerId}::uuid FOR UPDATE`
    const player = await tx.player.findUnique({
      where: { id: prepared.playerId },
      select: playerSelect,
    })
    if (!eligible(player, prepared.email) || player?.account?.authSubject !== prepared.authSubject)
      throw new ServiceError('conflict', { account: 'The account changed. Submit a new request.' })
    const saved = await tx.playerPasswordResetRequest.updateMany({
      where: { id, issuanceId },
      data: {
        status: 'issued',
        reviewedByAdminId: admin.adminId,
        reviewedAt: new Date(),
        authSubject: prepared.authSubject,
        tokenDigest: digest(token),
        consumedAt: null,
        issuanceId: null,
        issuanceStartedAt: null,
        revision: { increment: 1 },
      },
    })
    if (saved.count !== 1) throw new ServiceError('conflict')
    await recordAudit(tx, admin, {
      action: 'player.password_reset_link_issued',
      targetType: 'password_reset_request',
      targetId: id,
    })
    return { token }
  })
}

/** Atomically burns the reviewed token before provider verification. Failures need a new link. */
export async function consumeReviewedResetToken(token: string) {
  if (!token || token.length > 1024) throw new ServiceError('forbidden', { link: INVALID_LINK })
  return prisma.$transaction(async (tx) => {
    const tokenDigest = digest(token)
    const request = await tx.playerPasswordResetRequest.findUnique({
      where: { tokenDigest },
      include: { player: { select: playerSelect } },
    })
    if (
      !request ||
      request.status !== 'issued' ||
      request.consumedAt ||
      !eligible(request.player, request.email) ||
      request.authSubject !== request.player?.account?.authSubject
    )
      throw new ServiceError('forbidden', { link: INVALID_LINK })
    const used = await tx.playerPasswordResetRequest.updateMany({
      where: { id: request.id, tokenDigest, consumedAt: null },
      data: { tokenDigest: null, consumedAt: new Date(), revision: { increment: 1 } },
    })
    if (used.count !== 1) throw new ServiceError('forbidden', { link: INVALID_LINK })
    return { playerId: request.playerId, authSubject: request.authSubject }
  })
}
