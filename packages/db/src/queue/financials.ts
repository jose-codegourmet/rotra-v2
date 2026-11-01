import 'server-only'
import {
  amountDuePerHead,
  estimateSessionCost,
  normalizeSessionCost,
  paymentTotals,
} from '@rotra/data/session-cost/rules'
import type { SessionCostInput } from '@rotra/data/session-cost/types'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { InventoryCategory, InventoryItem, Prisma, QueueSession } from '../generated/prisma/client'
import { requireClubEntitlement, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso, toIsoOrNull, toMoney } from '../service/serialize'
import {
  derivedId,
  liveCourts,
  liveRoster,
  lockSession,
  requireSessionAccess,
  type Tx,
} from './session-store'

/**
 * Financials and inventory (Q-MONEY). Club-private: never in public reads, snapshots or exports.
 * Money is integer centavos end to end; the pure rules in `@rotra/data/session-cost/rules` do the
 * arithmetic (court fee rounds to the nearest centavo, break-even rounds up to a whole peso).
 * Null means "not set" and is never turned into 0 on the wire.
 */

const CATEGORIES: InventoryCategory[] = ['shuttlecocks', 'equipment', 'other']

function centavos(value: number | null | undefined, field: string, { allowNull = true } = {}) {
  if (value == null) {
    if (allowNull) return null
    throw new ServiceError('invalid', { [field]: 'Enter an amount.' })
  }
  if (!Number.isSafeInteger(value) || value < 0)
    throw new ServiceError('invalid', { [field]: 'Enter an amount of zero or more.' })
  return value
}

function inventoryDto(item: InventoryItem) {
  return {
    id: item.id,
    clubId: item.clubId,
    name: item.name,
    category: item.category,
    unit: item.unit,
    stock: item.stock,
    unitCostMinor: item.unitCostMinor,
    currency: item.currency,
    removedAt: toIsoOrNull(item.removedAt),
    revision: toDecimalString(item.revision),
  }
}

export async function readInventory(context: ClubContext) {
  const items = await prisma.inventoryItem.findMany({
    where: { clubId: context.clubId, removedAt: null },
    orderBy: [{ category: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  })
  return items.map(inventoryDto)
}

/** Q-MONEY · inventory add/edit. `id` is the client's stable ID, so a retried add is one item. */
export async function saveInventoryItem(
  context: ClubContext,
  input: {
    id: string
    expectedRevision?: string
    name: string
    category: InventoryCategory
    unit?: string
    stock: number
    unitCostMinor: number
  },
) {
  await requireClubEntitlement(context)
  const name = input.name.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter a name.' })
  if (!CATEGORIES.includes(input.category)) throw new ServiceError('invalid', { category: 'Choose a category.' })
  if (!Number.isInteger(input.stock) || input.stock < 0)
    throw new ServiceError('invalid', { stock: 'Enter a stock of zero or more.' })
  const unitCostMinor = centavos(input.unitCostMinor, 'unitCost', { allowNull: false }) as number
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findUnique({ where: { id: input.id } })
    if (existing && existing.clubId !== context.clubId) throw new ServiceError('not_found')
    const data = { name, category: input.category, unit: input.unit?.trim() || 'piece', stock: input.stock, unitCostMinor }
    if (!existing)
      return inventoryDto(await tx.inventoryItem.create({ data: { id: input.id, clubId: context.clubId, ...data } }))
    if (existing.removedAt) throw new ServiceError('not_found')
    if (input.expectedRevision === undefined) return inventoryDto(existing)
    requireRevision(existing.revision, input.expectedRevision)
    return inventoryDto(
      await tx.inventoryItem.update({ where: { id: existing.id }, data: { ...data, revision: { increment: 1 } } }),
    )
  })
}

/** Stock steps by one; it is never decremented by sessions in v1. */
export async function stepInventoryStock(context: ClubContext, input: { id: string; delta: -1 | 1 }) {
  await requireClubEntitlement(context)
  if (input.delta !== 1 && input.delta !== -1) throw new ServiceError('invalid')
  const rows = await prisma.$executeRaw`
    UPDATE "inventory_items" SET "stock" = "stock" + ${input.delta}, "revision" = "revision" + 1, "updated_at" = now()
    WHERE "id" = ${input.id}::uuid AND "club_id" = ${context.clubId}::uuid AND "removed_at" IS NULL
      AND "stock" + ${input.delta} >= 0`
  if (!rows) throw new ServiceError('invalid', { stock: 'Stock can’t go below zero.' })
  return inventoryDto(await prisma.inventoryItem.findUniqueOrThrow({ where: { id: input.id } }))
}

/** Soft remove: past estimates may still reference the item. */
export async function removeInventoryItem(context: ClubContext, id: string) {
  await requireClubEntitlement(context)
  await prisma.inventoryItem.updateMany({
    where: { id, clubId: context.clubId, removedAt: null },
    data: { removedAt: new Date(), revision: { increment: 1 } },
  })
  return null
}

const minutes = (session: QueueSession) =>
  Math.max(0, Math.round((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000))

async function costInput(tx: Tx, sessionId: string): Promise<SessionCostInput | null> {
  const estimate = await tx.sessionCostEstimate.findUnique({
    where: { sessionId },
    include: { planLines: { orderBy: { position: 'asc' } } },
  })
  if (!estimate) return null
  return {
    courtFeePerCourtHour: estimate.courtFeePerCourtHourMinor,
    entranceFeePerHead: estimate.entranceFeePerHeadMinor,
    paymentMode: estimate.paymentMode,
    customFeePerHead: estimate.customFeePerHeadMinor,
    shuttles: estimate.planLines.map((l) => ({ inventoryItemId: l.inventoryItemId, tubes: l.tubes })),
  }
}

/** The derived estimate for a session: totals are computed at read time, never stored. */
async function estimateFor(tx: Tx, session: QueueSession) {
  const input = await costInput(tx, session.id)
  if (!input) return { input: null, estimate: null, revision: null }
  const [courts, roster, inventory, row] = await Promise.all([
    liveCourts(tx, session.id),
    liveRoster(tx, session.id),
    tx.inventoryItem.findMany({ where: { clubId: session.clubId } }),
    tx.sessionCostEstimate.findUniqueOrThrow({ where: { sessionId: session.id }, select: { revision: true } }),
  ])
  const estimate = estimateSessionCost(input, {
    courts: courts.length,
    durationMinutes: minutes(session),
    players: roster.length || session.expectedPlayers || 0,
    inventory,
  })
  return { input, estimate, revision: toDecimalString(row.revision) }
}

export async function readSessionCost(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  return prisma.$transaction((tx) => estimateFor(tx, session))
}

/**
 * Q-SETUP/Q-MONEY · save the estimate. Online only (never accepted from a sync upload) and not
 * after Session done. Plan lines must be this club's items; a zero-tube line is dropped. An empty
 * estimate deletes the row ("no fee").
 */
export async function saveSessionCost(
  context: ClubContext,
  sessionId: string,
  input: { values: SessionCostInput | null; expectedRevision: string | null },
) {
  await requireClubEntitlement(context)
  const values = normalizeSessionCost(input.values)
  if (values) {
    centavos(values.courtFeePerCourtHour, 'courtFee')
    centavos(values.entranceFeePerHead, 'entranceFee')
    if (values.paymentMode === 'custom') centavos(values.customFeePerHead, 'customFee', { allowNull: false })
    for (const line of values.shuttles)
      if (!Number.isInteger(line.tubes) || line.tubes <= 0)
        throw new ServiceError('invalid', { shuttles: 'Enter a whole number of tubes.' })
  }
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    if (!['prepared', 'active'].includes(session.state))
      throw new ServiceError('invalid', { state: 'The estimate can’t change after the session closes.' })
    const existing = await tx.sessionCostEstimate.findUnique({ where: { sessionId } })
    if ((existing ? toDecimalString(existing.revision) : null) !== input.expectedRevision)
      throw new ServiceError('conflict')
    if (!values) {
      if (existing) await tx.sessionCostEstimate.delete({ where: { sessionId } })
      return estimateFor(tx, session)
    }
    const ids = [...new Set(values.shuttles.map((l) => l.inventoryItemId))]
    const owned = await tx.inventoryItem.count({ where: { clubId: context.clubId, id: { in: ids }, removedAt: null } })
    if (owned !== ids.length) throw new ServiceError('invalid', { shuttles: 'Choose items from this club’s inventory.' })
    const data: Prisma.SessionCostEstimateUncheckedUpdateInput = {
      courtFeePerCourtHourMinor: values.courtFeePerCourtHour,
      entranceFeePerHeadMinor: values.entranceFeePerHead,
      paymentMode: values.paymentMode,
      customFeePerHeadMinor: values.paymentMode === 'custom' ? values.customFeePerHead : null,
    }
    if (existing) {
      await tx.sessionShuttlePlanLine.deleteMany({ where: { sessionId } })
      await tx.sessionCostEstimate.update({ where: { sessionId }, data: { ...data, revision: { increment: 1 } } })
    } else
      await tx.sessionCostEstimate.create({
        data: { ...(data as Prisma.SessionCostEstimateUncheckedCreateInput), sessionId, clubId: context.clubId },
      })
    for (const [position, line] of values.shuttles.entries())
      await tx.sessionShuttlePlanLine.create({
        data: { clubId: context.clubId, sessionId, inventoryItemId: line.inventoryItemId, tubes: line.tubes, position },
      })
    await tx.queueSession.update({ where: { id: sessionId }, data: { revision: { increment: 1 } } })
    return estimateFor(tx, session)
  })
}

/** Payments are open in prepared, active and completed sessions; never invalid or mid-finalization. */
function requirePaymentsOpen(session: QueueSession) {
  if (session.state === 'invalid' || session.state === 'finalizing')
    throw new ServiceError('invalid', { state: 'Payments are not available for this session.' })
}

/** Q-MONEY read. Recorded amounts come from the marks, never recomputed from today's fee. */
export async function readSessionPayments(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  if (session.state === 'invalid') return null
  await requireSessionAccess(context, session)
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, sessionId)
    const marks = await tx.sessionPaymentMark.findMany({
      where: { sessionId, sessionPlayerId: { in: roster.map((r) => r.id) } },
    })
    const { input, estimate } = await estimateFor(tx, session)
    const amountDue = amountDuePerHead(estimate)
    const byEntry = new Map(marks.map((m) => [m.sessionPlayerId, m]))
    const players = roster
      .map((p) => {
        const mark = byEntry.get(p.id)
        return {
          sessionPlayerId: p.id,
          clubPlayerId: p.clubPlayerId,
          name: p.nameSnapshot,
          paid: mark ? { amount: toMoney(mark.amountMinor, mark.currency), at: toIso(mark.markedAt) } : null,
        }
      })
      .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
    return {
      players,
      amountDue,
      dueBasis: input?.paymentMode ?? 'break_even',
      entranceFeeIncluded: estimate?.entranceFeePerHead ?? null,
      totals: paymentTotals({
        // A no-fee tick (null amount) adds nothing collected; its meaning is pending #245.
        marks: marks.map((m) => ({ amountMinor: m.amountMinor ?? 0 })),
        total: roster.length,
        amountDue,
        cost: estimate?.total ?? null,
      }),
    }
  })
}

/**
 * Q-MONEY · tick paid / untick. A tick records the amount due at that moment (null when no fee is
 * set) under its operation ID: a duplicate applies once and a later fee change never rewrites it.
 * The mark keys on the roster entry, which is released (not deleted), so it survives demotion and
 * shows again on restoration. Unticking deletes the mark.
 */
export async function setPaid(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; sessionPlayerId: string; paid: boolean; deviceId?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
    requirePaymentsOpen(session)
    const entry = await tx.sessionPlayer.findUnique({ where: { id: input.sessionPlayerId } })
    if (!entry || entry.sessionId !== sessionId) throw new ServiceError('not_found')
    const mark = await tx.sessionPaymentMark.findUnique({
      where: { sessionId_sessionPlayerId: { sessionId, sessionPlayerId: entry.id } },
    })
    if (input.paid) {
      if (mark) return { paid: true, amount: toMoney(mark.amountMinor, mark.currency) }
      if (entry.releasedAt) throw new ServiceError('invalid', { player: 'Player not in this session.' })
      const { estimate } = await estimateFor(tx, session)
      const amountMinor = amountDuePerHead(estimate)
      const created = await tx.sessionPaymentMark.create({
        data: {
          sessionId,
          sessionPlayerId: entry.id,
          clubId: context.clubId,
          amountMinor,
          markedAt: new Date(),
          sourceOperationId: input.operationId,
          actorClubId: context.clubId,
          deviceId: input.deviceId ?? null,
        },
      })
      return { paid: true, amount: toMoney(created.amountMinor, created.currency) }
    }
    if (mark) await tx.sessionPaymentMark.delete({ where: { sessionId_sessionPlayerId: { sessionId, sessionPlayerId: entry.id } } })
    return { paid: false, amount: null }
  })
}

/** Q-MONEY · Mark all paid: ticks every live unpaid entry at the current amount, once. */
export async function markAllPaid(context: ClubContext, sessionId: string, input: { operationId: string; deviceId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session)
    requirePaymentsOpen(session)
    const roster = await liveRoster(tx, sessionId)
    const { estimate } = await estimateFor(tx, session)
    const amountMinor = amountDuePerHead(estimate)
    const now = new Date()
    let count = 0
    for (const entry of roster) {
      const operationId = await derivedId(input.operationId, entry.id)
      const exists = await tx.sessionPaymentMark.findUnique({
        where: { sessionId_sessionPlayerId: { sessionId, sessionPlayerId: entry.id } },
      })
      if (exists) continue
      await tx.sessionPaymentMark.create({
        data: {
          sessionId,
          sessionPlayerId: entry.id,
          clubId: context.clubId,
          amountMinor,
          markedAt: now,
          sourceOperationId: operationId,
          actorClubId: context.clubId,
          deviceId: input.deviceId ?? null,
        },
      })
      count++
    }
    return { count }
  })
}
