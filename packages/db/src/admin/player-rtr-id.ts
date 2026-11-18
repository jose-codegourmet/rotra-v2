import 'server-only'
import {
  adminPlayerChangedFields,
  adminPlayerRtrIdChange,
  adminPlayerSavedMessage,
} from '@rotra/data/admin-player/rules'
import type { AdminPlayerChangedField, AdminPlayerEditInput } from '@rotra/data/admin-player/types'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import {
  lockEmail,
  normalizeEmail,
  registeredPlayerByEmail,
  replaceRtrId,
} from '../player/shared-entry'
import { requireAdmin, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'
import { readAdminPlayerDirectory, readAdminPlayerEdit } from './players'

type Tx = Prisma.TransactionClient
type Values = Omit<AdminPlayerEditInput, 'id' | 'revision'>

const RTR_PARTS = /^RTR-([A-Z]{2})-([A-Z]{3})-(\d{2})(\d{2})(\d{2})-(\d{4,})$/
const DATE_ERROR = 'Enter a valid date.'
/** Same text as `ADMIN_PLAYER_REASON_REQUIRED` in `@rotra/schema/admin-player` (the form's rule). */
const ADMIN_PLAYER_REASON_REQUIRED = 'Say why you are making this change.'
/** Same text as `ADMIN_PLAYER_RTR_ID_TAKEN` in `@rotra/schema/admin-player`. */
const RTR_ID_TAKEN = 'Another player already has this RTR ID. Choose another place or date.'

/**
 * Admin's RTR ID change (D-2026-11-16-04): the registration place or date changed, so the RTR ID
 * follows both and keeps its number (`adminPlayerRtrIdChange`, shared with mock mode). Null when it
 * stays as it is. The place must be a founding location ROTRA knows.
 */
export function plannedRtrId(edit: { rtrId: string | null }, values: Values) {
  const next = adminPlayerRtrIdChange(edit, values)
  if (!next || !edit.rtrId) return null
  const parts = RTR_PARTS.exec(next)
  if (!parts) throw new ServiceError('invalid', { registrationDate: DATE_ERROR })
  const [, country, city, mm, dd, yy, number] = parts
  const syncDate = `20${yy}-${mm}-${dd}`
  const day = new Date(`${syncDate}T00:00:00Z`)
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== syncDate)
    throw new ServiceError('invalid', { registrationDate: DATE_ERROR })
  return {
    from: edit.rtrId,
    rtrId: next,
    countryCode: country as string,
    cityCode: city as string,
    syncDate,
    sequence: Number(number),
  }
}

/** Refuses, before anything is saved, a new RTR ID another person already has. */
export async function refuseTakenRtrId(plan: NonNullable<ReturnType<typeof plannedRtrId>>) {
  const taken =
    (await prisma.sharedPlayerEntry.findUnique({
      where: { rtrId: plan.rtrId },
      select: { id: true },
    })) ??
    (await prisma.playerIdAllocation.findUnique({
      where: { rtrId: plan.rtrId },
      select: { playerId: true },
    }))
  if (taken) throw new ServiceError('conflict', { registrationDate: RTR_ID_TAKEN })
}

/** Applies a planned change in the caller's transaction: every record holding the old string. */
export async function applyRtrIdChange(tx: Tx, plan: NonNullable<ReturnType<typeof plannedRtrId>>) {
  const location = await tx.locationCode.findUnique({
    where: { countryCode_cityCode: { countryCode: plan.countryCode, cityCode: plan.cityCode } },
    select: { id: true },
  })
  if (!location) throw new ServiceError('invalid', { registrationPlace: 'Choose a place.' })
  return replaceRtrId(tx, plan.from, {
    rtrId: plan.rtrId,
    locationCodeId: location.id,
    syncDate: plan.syncDate,
    sequence: plan.sequence,
  })
}

/**
 * Admin › Players › Edit for an unclaimed person saved with an email (`id` = the shared entry). The
 * entry holds only the email and the RTR ID, so those are what Admin changes here (only Admin can
 * change the email; D-2026-11-16-04); each club keeps and edits its own name, nickname and details.
 * One transaction under the entry's revision, one Activity log entry.
 */
export async function saveAdminSharedEntry(
  context: AdminContext,
  input: { playerId: string; revision: string; values: Values },
) {
  requireAdmin(context)
  const edit = await readAdminPlayerEdit(context, input.playerId)
  requireRevision(BigInt(edit.revision), input.revision)
  const values = input.values
  const changed = adminPlayerChangedFields(
    { ...edit, revision: Number(edit.revision) },
    values,
  ).filter((field) => field !== 'password' || values.password !== '')
  const other = changed.filter((field) => field !== 'email')
  if (other.length)
    // Each club keeps and edits its own details for an unclaimed person; the entry has none.
    throw new ServiceError('invalid', { player: 'Only registered players can be edited here.' })
  const plan = plannedRtrId(edit, values)
  if (plan) await refuseTakenRtrId(plan)
  const saved: AdminPlayerChangedField[] = [...changed, ...(plan ? (['RTR ID'] as const) : [])]
  if (!saved.length) {
    const [player] = await readAdminPlayerDirectory(context, input.playerId)
    if (!player) throw new ServiceError('not_found')
    return {
      player,
      changed: [],
      passwordSet: false,
      message: adminPlayerSavedMessage(player.name, []),
      warnings: [],
    }
  }
  const reason = values.reason.trim()
  if (!reason) throw new ServiceError('invalid', { reason: ADMIN_PLAYER_REASON_REQUIRED })
  const email = changed.includes('email') ? normalizeEmail(values.email) : null
  if (changed.includes('email') && !email)
    throw new ServiceError('invalid', { email: 'Enter an email address, like name@example.com.' })
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "shared_player_entries"
      WHERE "id" = ${input.playerId}::uuid AND "claimed_player_id" IS NULL AND "retired_at" IS NULL
      FOR UPDATE`
    if (!locked.length) throw new ServiceError('not_found')
    const entry = await tx.sharedPlayerEntry.findUniqueOrThrow({ where: { id: input.playerId } })
    requireRevision(entry.revision, input.revision)
    if (email) {
      await lockEmail(tx, email)
      const taken =
        (await registeredPlayerByEmail(tx, email)) ??
        (await tx.sharedPlayerEntry.findFirst({
          where: { email, id: { not: entry.id } },
          select: { id: true },
        })) ??
        (await tx.playerPrivateContact.findUnique({ where: { email }, select: { playerId: true } }))
      if (taken)
        throw new ServiceError('invalid', {
          email: 'This email is already linked to another player.',
        })
      await tx.sharedPlayerEntry.update({
        where: { id: entry.id },
        data: { email, revision: { increment: 1 } },
      })
    }
    if (plan) await applyRtrIdChange(tx, plan)
    else
      await tx.sharedPlayerEntry.update({
        where: { id: entry.id },
        data: { revision: { increment: 1 } },
      })
    await recordAudit(tx, context, {
      action: 'player.profile_updated',
      targetType: 'player',
      targetId: entry.id,
      // No contact value and no old RTR ID: after the change no row holds the old string.
      metadata: {
        after: { name: edit.name, nickname: edit.nickname },
        changed: saved,
        reason,
        ...(plan ? { rtrId: plan.rtrId } : {}),
      },
    })
  })
  const [player] = await readAdminPlayerDirectory(context, input.playerId)
  if (!player) throw new ServiceError('not_found')
  return {
    player,
    changed: saved,
    passwordSet: false,
    message: adminPlayerSavedMessage(player.name, saved),
    warnings: [] as string[],
  }
}

/**
 * The RTR ID part of a registered player's Admin edit, after the profile fields saved: one
 * transaction locking the player, replacing the string everywhere, one Activity log entry.
 */
export async function saveRegisteredRtrId(
  context: AdminContext,
  input: {
    playerId: string
    plan: NonNullable<ReturnType<typeof plannedRtrId>>
    reason: string
    name: string
    operationId: string
  },
) {
  requireAdmin(context)
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "players" WHERE "id" = ${input.playerId}::uuid FOR UPDATE`
    if (!locked.length) throw new ServiceError('not_found')
    const allocation = await tx.playerIdAllocation.findUnique({
      where: { playerId: input.playerId },
      select: { rtrId: true },
    })
    if (allocation?.rtrId !== input.plan.from)
      throw new ServiceError('conflict', {
        registrationDate: 'This player changed since you opened the form. Reload before editing.',
      })
    await applyRtrIdChange(tx, input.plan)
    await tx.player.update({
      where: { id: input.playerId },
      data: { revision: { increment: 1 } },
    })
    await recordAudit(tx, context, {
      action: 'player.profile_updated',
      targetType: 'player',
      targetId: input.playerId,
      metadata: {
        after: { name: input.name },
        changed: ['RTR ID'],
        reason: input.reason,
        rtrId: input.plan.rtrId,
        operationId: input.operationId,
      },
    })
  })
}
