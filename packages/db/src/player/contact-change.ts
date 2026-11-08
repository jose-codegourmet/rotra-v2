import 'server-only'
import { CONTACT_FIELD_WORD, checksFor } from '@rotra/data/contact-change-request/rules'
import type { ContactCheck } from '@rotra/data/contact-change-request/types'
import { recordAudit } from '../admin/audit'
import type { AdminContext, PlayerContext } from '../auth/account-context'
import { type ProviderAdmin, ProviderError } from '../auth/provider-admin'
import { prisma } from '../client/prisma'
import type {
  ContactChangeField,
  PlayerContactChangeRequest,
  Prisma,
} from '../generated/prisma/client'
import { requireAdmin } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toIso, toIsoOrNull } from '../service/serialize'

type Tx = Prisma.TransactionClient

const E164 = /^\+[1-9][0-9]{7,14}$/
const EMAIL = /^[^@\s]+@[^@\s]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Contact changes are the ONLY way a phone or login email changes after claiming. No other service
 * in this package writes `player_private_contacts.phone_e164` or `.email` for a claimed player, and
 * provider-side direct changes are detected by `reconcileContactChange` (provider ≠ contacts).
 */
function normalize(field: ContactChangeField, value: string) {
  const v = value.trim()
  if (field === 'phone') {
    if (!E164.test(v))
      throw new ServiceError('invalid', {
        value: 'Enter a Philippine mobile number, like 0917 555 0142.',
      })
    return v
  }
  const email = v.toLowerCase()
  if (!EMAIL.test(email))
    throw new ServiceError('invalid', { value: 'Enter an email address, like name@example.com.' })
  return email
}

/**
 * Status shown to the player and the owner. `approved`/`applying`/`failed` all read as "approved,
 * not applied yet": only `applied` means the login contact changed.
 */
function statusLabel(status: PlayerContactChangeRequest['status']) {
  if (status === 'approved' || status === 'applying' || status === 'failed')
    return 'approved_pending'
  return status
}

/**
 * Own-player view: the proposed and original values are their own contacts; review evidence
 * (source, attempts, failure code, reviewer) is not theirs to see.
 */
function ownRequestDto(request: PlayerContactChangeRequest) {
  return {
    id: request.id,
    playerId: request.playerId,
    field: request.field,
    originalValue: request.originalValue,
    proposedValue: request.proposedValue,
    status: statusLabel(request.status),
    requestedAt: toIso(request.requestedAt),
    appliedAt: toIsoOrNull(request.appliedAt),
    rejectedAt: toIsoOrNull(request.rejectedAt),
  }
}

/** Owner view (A-REQUESTS). Contact values are private to the platform owner and the player. */
function adminRequestDto(request: PlayerContactChangeRequest) {
  return {
    ...ownRequestDto(request),
    playerId: request.playerId,
    source: request.source,
    originalValue: request.originalValue,
    rawStatus: request.status,
    applicationAttempts: request.applicationAttempts,
    failureCode: request.failureCode,
    reviewedAt: toIsoOrNull(request.reviewedAt),
  }
}

async function collides(tx: Tx, playerId: string, field: ContactChangeField, value: string) {
  const owner =
    field === 'phone'
      ? await tx.playerPrivateContact.findUnique({
          where: { phoneE164: value },
          select: { playerId: true },
        })
      : await tx.playerPrivateContact.findUnique({
          where: { email: value },
          select: { playerId: true },
        })
  return !!owner && owner.playerId !== playerId
}

async function submit(
  tx: Tx,
  playerId: string,
  input: { commandId: string; field: ContactChangeField; value: string },
  source: { kind: 'app' } | { kind: 'owner'; adminId: string },
) {
  const repeated = await tx.playerContactChangeRequest.findUnique({
    where: { sourceCommandId: input.commandId },
  })
  if (repeated) {
    if (repeated.playerId !== playerId) throw new ServiceError('not_found')
    return repeated
  }
  const proposed = normalize(input.field, input.value)
  const contact = await tx.playerPrivateContact.findUnique({ where: { playerId } })
  if (!contact) throw new ServiceError('not_found')
  const original = input.field === 'phone' ? contact.phoneE164 : contact.email
  const word = CONTACT_FIELD_WORD[input.field]
  // The owner enters it for the player, so the copy names the player, not "your".
  const owner = source.kind === 'owner'
  if (original === proposed)
    throw new ServiceError('invalid', {
      value: owner ? `That's already this player's ${word}.` : `That's already your ${word}.`,
    })
  if (await collides(tx, playerId, input.field, proposed))
    throw new ServiceError('conflict', {
      value: owner
        ? `That ${word} belongs to another ROTRA profile.`
        : `That ${word} belongs to another ROTRA profile. Contact ROTRA for help.`,
    })
  return tx.playerContactChangeRequest.create({
    data: {
      playerId,
      field: input.field,
      source: source.kind,
      proposedValue: proposed,
      originalValue: original,
      originalContactRevision: contact.revision,
      requestedAt: new Date(),
      submittedByAdminId: source.kind === 'owner' ? source.adminId : null,
      sourceCommandId: input.commandId,
    },
  })
}

function mapOpen(error: unknown): never {
  if ((error as { code?: string })?.code === 'P2002')
    throw new ServiceError('conflict', { request: 'A contact change is already open.' })
  throw error
}

/** P-ACCOUNT · Request a contact change. One open request per player (partial unique). */
export async function submitOwnContactChange(
  context: PlayerContext,
  input: { commandId: string; field: ContactChangeField; value: string },
) {
  try {
    return ownRequestDto(
      await prisma.$transaction((tx) => submit(tx, context.playerId, input, { kind: 'app' })),
    )
  } catch (error) {
    mapOpen(error)
  }
}

export async function readOwnContactChanges(context: PlayerContext) {
  const rows = await prisma.playerContactChangeRequest.findMany({
    where: { playerId: context.playerId },
    orderBy: [{ requestedAt: 'desc' }, { id: 'asc' }],
    take: 10,
  })
  return rows.map(ownRequestDto)
}

/**
 * A-REQUESTS · owner enters a request on the player's behalf (also A-PLAYERS › Edit profile, #564).
 * Creates a pending request only. The owner's reason has no request column, so it is kept in the
 * audit event of the same transaction (metadata: request ID, field and reason, never a contact).
 */
export async function submitContactChangeForPlayer(
  context: AdminContext,
  input: {
    commandId: string
    playerId: string
    field: ContactChangeField
    value: string
    reason?: string
  },
) {
  requireAdmin(context)
  const reason = input.reason?.trim()
  if (input.reason !== undefined && !reason)
    throw new ServiceError('invalid', { reason: 'Enter a reason.' })
  try {
    return adminRequestDto(
      await prisma.$transaction(async (tx) => {
        const request = await submit(tx, input.playerId, input, {
          kind: 'owner',
          adminId: context.adminId,
        })
        if (reason)
          await recordAudit(tx, context, {
            action: 'player.contact_change_submitted',
            targetType: 'player',
            targetId: request.playerId,
            sourceCommandId: input.commandId,
            metadata: { requestId: request.id, field: request.field, reason },
          })
        return request
      }),
    )
  } catch (error) {
    mapOpen(error)
  }
}

export async function readContactChangeQueue(context: AdminContext) {
  void context
  const rows = await prisma.playerContactChangeRequest.findMany({
    where: { status: { in: ['pending', 'approved', 'applying', 'failed'] } },
    orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(adminRequestDto)
}

const playerSelect = {
  id: true,
  fullName: true,
  nickname: true,
  idAllocation: { select: { rtrId: true } },
  account: { select: { playerId: true } },
  privateContact: { select: { phoneE164: true, email: true } },
  clubPlayers: {
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: { nickname: true },
  },
} satisfies Prisma.PlayerSelect

type SelectedPlayer = Prisma.PlayerGetPayload<{ select: typeof playerSelect }>
type HeldContact = { phoneE164: string | null; email: string | null } | null

function holderOf(player: SelectedPlayer, contact: HeldContact) {
  return {
    id: player.id,
    fullName: player.fullName,
    rtrId: player.idAllocation?.rtrId ?? '',
    phone: contact?.phoneE164 ?? undefined,
    email: contact?.email ?? undefined,
  }
}

function checkedOf(entry: {
  id: string
  playerId: string
  field: ContactChangeField
  originalValue: string | null
  proposedValue: string
  status: PlayerContactChangeRequest['status']
  requestedAt: Date
}) {
  return {
    requestId: entry.id,
    playerId: entry.playerId,
    field: entry.field,
    fromValue: entry.originalValue ?? '',
    toValue: entry.proposedValue,
    status: entry.status,
    requestedAt: entry.requestedAt.getTime(),
  }
}

/**
 * A-CONTACT-REQUESTS, A-CONTACT-REVIEW and a player's requests on A-PLAYER-DETAIL (#401): every
 * request (or one), newest first, each with its player and current contacts. Pre-approval checks
 * exist only while a request waits for review and use the same `checksFor` as the mock. Another
 * player is named by name and RTR ID only, never by a contact. Owner-only; the provider operation
 * ref, attempt counts, reviewer IDs and notes are not sent.
 */
export async function readAdminContactChangeRequests(
  context: AdminContext,
  filter: { requestId?: string } = {},
) {
  requireAdmin(context)
  if (filter.requestId !== undefined && !UUID.test(filter.requestId)) return []
  const rows = await prisma.playerContactChangeRequest.findMany({
    where: filter.requestId ? { id: filter.requestId } : {},
    orderBy: [{ requestedAt: 'desc' }, { id: 'asc' }],
    include: { player: { select: playerSelect } },
  })
  const pending = rows.filter((row) => row.status === 'pending')
  const proposed = (field: ContactChangeField) =>
    pending.filter((row) => row.field === field).map((row) => row.proposedValue)
  // Only what the checks need: the request players' other requests and whoever holds a proposal.
  const [siblings, holders] = pending.length
    ? await Promise.all([
        prisma.playerContactChangeRequest.findMany({
          where: { playerId: { in: [...new Set(pending.map((row) => row.playerId))] } },
          select: {
            id: true,
            playerId: true,
            field: true,
            originalValue: true,
            proposedValue: true,
            status: true,
            requestedAt: true,
          },
        }),
        prisma.playerPrivateContact.findMany({
          where: {
            OR: [{ phoneE164: { in: proposed('phone') } }, { email: { in: proposed('email') } }],
          },
          select: {
            playerId: true,
            phoneE164: true,
            email: true,
            player: { select: playerSelect },
          },
        }),
      ])
    : [[], []]
  return rows.map((row) => {
    const checks: ContactCheck[] | null =
      row.status === 'pending'
        ? checksFor(
            checkedOf(row),
            [
              holderOf(row.player, row.player.privateContact),
              ...holders
                .filter((holder) => holder.playerId !== row.playerId)
                .map((holder) => holderOf(holder.player, holder)),
            ],
            siblings.map(checkedOf),
          )
        : null
    return {
      requestId: row.id,
      playerId: row.playerId,
      field: row.field,
      fromValue: row.originalValue ?? '',
      toValue: row.proposedValue,
      status: row.status,
      source: row.source,
      requestedAt: toIso(row.requestedAt),
      approvedAt: toIsoOrNull(row.approvedAt),
      appliedAt: toIsoOrNull(row.appliedAt),
      decidedAt: toIsoOrNull(row.rejectedAt),
      failureCode: row.failureCode,
      player: {
        id: row.player.id,
        fullName: row.player.fullName,
        rtrId: row.player.idAllocation?.rtrId ?? '',
        nickname:
          row.player.nickname ??
          row.player.clubPlayers.find((entry) => entry.nickname)?.nickname ??
          null,
        claimed: Boolean(row.player.account),
        phone: row.player.privateContact?.phoneE164 ?? undefined,
        email: row.player.privateContact?.email ?? undefined,
      },
      checks,
    }
  })
}

/** D-CONTACT › Decline. Changes no contact; repeat-safe; the review audit line is appended once. */
export async function declineContactChange(context: AdminContext, requestId: string) {
  requireAdmin(context)
  await reviewContactChange(context, { requestId, decision: 'reject' })
  const [request] = await readAdminContactChangeRequests(context, { requestId })
  if (!request) throw new ServiceError('not_found')
  return request
}

async function lockRequest(tx: Tx, requestId: string) {
  if (!UUID.test(requestId)) throw new ServiceError('not_found')
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "player_contact_change_requests" WHERE "id" = ${requestId}::uuid FOR UPDATE`
  if (!rows.length) throw new ServiceError('not_found')
  return tx.playerContactChangeRequest.findUniqueOrThrow({ where: { id: requestId } })
}

/**
 * Owner review. Approval rechecks the contact revision and collisions and reserves the value (the
 * partial unique on approved values); it does NOT change contacts. Application is a separate step.
 */
export async function reviewContactChange(
  context: AdminContext,
  input: { requestId: string; decision: 'approve' | 'reject'; note?: string },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await lockRequest(tx, input.requestId)
      const target = input.decision === 'approve' ? 'approved' : 'rejected'
      if (request.status !== 'pending') {
        if (statusLabel(request.status) === statusLabel(target) || request.status === 'applied')
          return adminRequestDto(request)
        throw new ServiceError('conflict', { request: 'This request has already been decided.' })
      }
      const now = new Date()
      if (input.decision === 'reject') {
        const rejected = await tx.playerContactChangeRequest.update({
          where: { id: request.id },
          data: {
            status: 'rejected',
            reviewedByAdminId: context.adminId,
            reviewedAt: now,
            rejectedAt: now,
            resolutionNote: input.note?.trim() || null,
            revision: { increment: 1 },
          },
        })
        await recordAudit(tx, context, {
          action: 'player.contact_change_rejected',
          targetType: 'player',
          targetId: request.playerId,
          metadata: { requestId: request.id, field: request.field },
        })
        return adminRequestDto(rejected)
      }
      const contact = await tx.playerPrivateContact.findUniqueOrThrow({
        where: { playerId: request.playerId },
      })
      if (contact.revision !== request.originalContactRevision)
        throw new ServiceError('conflict', {
          request: 'The player’s contacts changed since this request.',
        })
      if (await collides(tx, request.playerId, request.field, request.proposedValue))
        throw new ServiceError('conflict', { value: 'This contact is used by another player.' })
      const approved = await tx.playerContactChangeRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedByAdminId: context.adminId,
          reviewedAt: now,
          approvedAt: now,
          providerOperationRef: crypto.randomUUID(),
          resolutionNote: input.note?.trim() || null,
          revision: { increment: 1 },
        },
      })
      await recordAudit(tx, context, {
        action: 'player.contact_change_approved',
        targetType: 'player',
        targetId: request.playerId,
        metadata: { requestId: request.id, field: request.field },
      })
      return adminRequestDto(approved)
    })
  } catch (error) {
    mapOpen(error)
  }
}

/**
 * Applies an approved change in two stages and is safe to call again after any failure, duplicate
 * delivery or lost response:
 *
 * 1. Mark `applying` (attempt counted) in a short transaction; the account's sync status follows.
 * 2. Outside any transaction, set the provider login identifier with the request's stable
 *    `providerOperationRef`. A provider error marks `failed` with a code and stops.
 * 3. Reconcile: read the provider back; only when the provider holds the proposed value does one
 *    transaction update the private contact, mark the account in sync and set `applied`.
 *
 * The RTR ID and every history row are untouched: identity is the player UUID, not the contact.
 */
export async function applyContactChange(
  context: AdminContext,
  provider: ProviderAdmin,
  requestId: string,
) {
  const staged = await prisma.$transaction(async (tx) => {
    const request = await lockRequest(tx, requestId)
    if (request.status === 'applied') return { request, account: null }
    if (!['approved', 'applying', 'failed'].includes(request.status))
      throw new ServiceError('invalid', { request: 'Approve this request before applying it.' })
    const account = await tx.playerAccount.findUnique({ where: { playerId: request.playerId } })
    const updated = await tx.playerContactChangeRequest.update({
      where: { id: request.id },
      data: {
        status: 'applying',
        applicationAttempts: { increment: 1 },
        lastAttemptAt: new Date(),
        failureCode: null,
        revision: { increment: 1 },
      },
    })
    if (account)
      await tx.playerAccount.update({
        where: { playerId: account.playerId },
        data: { contactSyncStatus: 'applying', revision: { increment: 1 } },
      })
    return { request: updated, account }
  })
  const { request, account } = staged
  if (request.status === 'applied') return adminRequestDto(request)
  if (account && !request.providerAppliedAt) {
    try {
      await provider.updateLogin({
        operationRef: request.providerOperationRef as string,
        subject: account.authSubject,
        ...(request.field === 'email'
          ? { email: request.proposedValue }
          : { phoneE164: request.proposedValue }),
      })
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error
      return markFailed(request.id, error.code)
    }
  }
  return reconcileContactChange(context, provider, request.id)
}

async function markFailed(requestId: string, failureCode: string) {
  return prisma.$transaction(async (tx) => {
    const request = await lockRequest(tx, requestId)
    if (request.status === 'applied') return adminRequestDto(request)
    const failed = await tx.playerContactChangeRequest.update({
      where: { id: request.id },
      data: { status: 'failed', failureCode, revision: { increment: 1 } },
    })
    await tx.playerAccount.updateMany({
      where: { playerId: request.playerId },
      data: { contactSyncStatus: 'failed', revision: { increment: 1 } },
    })
    return adminRequestDto(failed)
  })
}

/**
 * Marks `applied` only when the provider's login identifier and the application contact agree.
 * An unclaimed player has no provider login, so only the private contact changes. A provider value
 * that matches neither the original nor the proposal is a direct-provider change and fails closed.
 */
export async function reconcileContactChange(
  context: AdminContext,
  provider: ProviderAdmin,
  requestId: string,
) {
  const request = await prisma.playerContactChangeRequest.findUnique({ where: { id: requestId } })
  if (!request) throw new ServiceError('not_found')
  if (request.status === 'applied') return adminRequestDto(request)
  const account = await prisma.playerAccount.findUnique({ where: { playerId: request.playerId } })
  if (account) {
    let login: Awaited<ReturnType<ProviderAdmin['readLogin']>>
    try {
      login = await provider.readLogin(account.authSubject)
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error
      return markFailed(request.id, error.code)
    }
    const value = request.field === 'email' ? login?.email : login?.phoneE164
    if (value !== request.proposedValue)
      return markFailed(
        request.id,
        value === request.originalValue ? 'provider_not_applied' : 'provider_mismatch',
      )
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await lockRequest(tx, requestId)
      if (current.status === 'applied') return adminRequestDto(current)
      if (await collides(tx, current.playerId, current.field, current.proposedValue))
        throw new ServiceError('conflict', { value: 'This contact is used by another player.' })
      const now = new Date()
      const contact = await tx.playerPrivateContact.update({
        where: { playerId: current.playerId },
        data:
          current.field === 'email'
            ? { email: current.proposedValue, emailVerifiedAt: null, revision: { increment: 1 } }
            : {
                phoneE164: current.proposedValue,
                phoneVerifiedAt: null,
                revision: { increment: 1 },
              },
      })
      if (account)
        await tx.playerAccount.update({
          where: { playerId: current.playerId },
          data: {
            contactSyncStatus: 'in_sync',
            contactSyncVersion: contact.revision,
            revision: { increment: 1 },
          },
        })
      const applied = await tx.playerContactChangeRequest.update({
        where: { id: current.id },
        data: {
          status: 'applied',
          providerAppliedAt: current.providerAppliedAt ?? now,
          appliedAt: now,
          failureCode: null,
          revision: { increment: 1 },
        },
      })
      await recordAudit(tx, context, {
        action: 'player.contact_change_applied',
        targetType: 'player',
        targetId: current.playerId,
        metadata: { requestId: current.id, field: current.field },
      })
      return adminRequestDto(applied)
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002')
      return markFailed(requestId, 'contact_collision')
    throw error
  }
}

/**
 * Drift check for a claimed player: if the provider's identifiers differ from the private contacts
 * with no applying request, the account is marked `failed` so the owner reconciles it. Never
 * copies a provider value into contacts by itself (that would be a direct-change bypass).
 */
export async function detectContactDrift(provider: ProviderAdmin, playerId: string) {
  const account = await prisma.playerAccount.findUnique({
    where: { playerId },
    include: { player: { select: { privateContact: true } } },
  })
  if (!account?.player.privateContact) return { drift: false }
  const login = await provider.readLogin(account.authSubject)
  const contact = account.player.privateContact
  const drift = !login || login.email !== contact.email || login.phoneE164 !== contact.phoneE164
  if (drift && account.contactSyncStatus === 'in_sync')
    await prisma.playerAccount.update({
      where: { playerId },
      data: { contactSyncStatus: 'failed', revision: { increment: 1 } },
    })
  return { drift }
}
