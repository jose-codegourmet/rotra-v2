import 'server-only'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import {
  amountDuePerHead,
  estimateSessionCost,
  normalizeSessionCost,
} from '@rotra/data/session-cost/rules'
import type { SessionCostInput } from '@rotra/data/session-cost/types'
import {
  fullRefundAmount,
  PAYMENT_REFUNDED_LOCKED_ERROR,
  REFUND_CHANGED_ERROR,
  REFUND_NOT_CANCELLED_ERROR,
  REFUND_NOTHING_TO_REFUND_ERROR,
  sessionRefundToast,
} from '@rotra/data/session-payment/refund-rules'
import {
  FREE_PAYMENT_LOCKED_ERROR,
  paymentTotals,
  receivedAmount,
} from '@rotra/data/session-payment/rules'
import { TRANSFER_PAYMENT_LOCKED_ERROR } from '@rotra/data/slot-transfer/transferAccounting.rules'
import { formatPeso } from '@rotra/schema/money'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type {
  InventoryCategory,
  InventoryItem,
  Prisma,
  QueueSession,
  SessionPlayer,
} from '../generated/prisma/client'
import { requireClubEntitlement, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso, toIsoOrNull, toMoney } from '../service/serialize'
import {
  derivedId,
  isOffRoster,
  liveCourts,
  liveRoster,
  lockSession,
  requireSessionAccess,
  type Tx,
} from './session-store'
import { slotLedger } from './transfer-accounting'

/**
 * Financials and inventory (Q-MONEY). Club-private: never in public reads, snapshots or exports.
 * Money is integer centavos end to end; the pure rules in `@rotra/data/session-cost/rules` do the
 * arithmetic (court fee rounds to the nearest centavo, break-even rounds up to a whole peso).
 * Null means "not set" and is never turned into 0 on the wire.
 */

const CATEGORIES: InventoryCategory[] = ['shuttlecocks', 'equipment', 'other']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  if (!UUID.test(input.id)) throw new ServiceError('invalid', { id: 'Expected a UUID.' })
  if (!name) throw new ServiceError('invalid', { name: 'Enter a name.' })
  if (!CATEGORIES.includes(input.category))
    throw new ServiceError('invalid', { category: 'Choose a category.' })
  if (!Number.isInteger(input.stock) || input.stock < 0)
    throw new ServiceError('invalid', { stock: 'Enter a stock of zero or more.' })
  const unitCostMinor = centavos(input.unitCostMinor, 'unitCost', { allowNull: false }) as number
  if (unitCostMinor % 100 !== 0)
    throw new ServiceError('invalid', { unitCost: 'Enter a whole-peso amount.' })
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findUnique({ where: { id: input.id } })
    if (existing && existing.clubId !== context.clubId) throw new ServiceError('not_found')
    const data = {
      name,
      category: input.category,
      unit: input.unit?.trim() || 'piece',
      stock: input.stock,
      unitCostMinor,
    }
    if (!existing)
      return inventoryDto(
        await tx.inventoryItem.create({ data: { id: input.id, clubId: context.clubId, ...data } }),
      )
    if (existing.removedAt) throw new ServiceError('not_found')
    if (input.expectedRevision === undefined) return inventoryDto(existing)
    requireRevision(existing.revision, input.expectedRevision)
    return inventoryDto(
      await tx.inventoryItem.update({
        where: { id: existing.id },
        data: { ...data, revision: { increment: 1 } },
      }),
    )
  })
}

/** Stock steps by one; it is never decremented by sessions in v1. */
export async function stepInventoryStock(
  context: ClubContext,
  input: { id: string; delta: -1 | 1 },
) {
  await requireClubEntitlement(context)
  if (input.delta !== 1 && input.delta !== -1) throw new ServiceError('invalid')
  if (!UUID.test(input.id)) throw new ServiceError('not_found')
  const rows = await prisma.$executeRaw`
    UPDATE "inventory_items" SET "stock" = "stock" + ${input.delta}, "revision" = "revision" + 1, "updated_at" = now()
    WHERE "id" = ${input.id}::uuid AND "club_id" = ${context.clubId}::uuid AND "removed_at" IS NULL
      AND "stock" + ${input.delta} >= 0`
  const item = await ownItem(context, input.id)
  if (!item || item.removedAt) throw new ServiceError('not_found')
  if (!rows) throw new ServiceError('invalid', { stock: 'Stock can’t go below zero.' })
  return inventoryDto(item)
}

/** This club's item by ID; another club's ID reads as missing. */
async function ownItem(context: ClubContext, id: string) {
  return prisma.inventoryItem.findFirst({ where: { id, clubId: context.clubId } })
}

/**
 * Soft remove: past estimates may still reference the item. A retried remove returns the removed
 * item again; an ID this club doesn't own is `not_found`.
 */
export async function removeInventoryItem(context: ClubContext, id: string) {
  await requireClubEntitlement(context)
  if (!UUID.test(id)) throw new ServiceError('not_found')
  await prisma.inventoryItem.updateMany({
    where: { id, clubId: context.clubId, removedAt: null },
    data: { removedAt: new Date(), revision: { increment: 1 } },
  })
  const item = await ownItem(context, id)
  if (!item) throw new ServiceError('not_found')
  return inventoryDto(item)
}

const minutes = (session: QueueSession) =>
  Math.max(
    0,
    Math.round((session.scheduledEndAt.getTime() - session.scheduledStartAt.getTime()) / 60_000),
  )

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
    shuttles: estimate.planLines.map((l) => ({
      inventoryItemId: l.inventoryItemId,
      tubes: l.tubes,
    })),
  }
}

/**
 * The derived estimate for a session: totals are computed at read time, never stored. Also returns
 * what the estimate used (live court count, scheduled minutes) and each plan line's item name.
 */
export async function estimateFor(tx: Tx, session: QueueSession) {
  const input = await costInput(tx, session.id)
  const durationMinutes = minutes(session)
  if (!input)
    return {
      input: null,
      estimate: null,
      revision: null,
      courts: 0,
      durationMinutes,
      shuttleLines: [],
    }
  const [courts, roster, inventory, row] = await Promise.all([
    liveCourts(tx, session.id),
    liveRoster(tx, session.id),
    tx.inventoryItem.findMany({ where: { clubId: session.clubId } }),
    tx.sessionCostEstimate.findUniqueOrThrow({
      where: { sessionId: session.id },
      select: { revision: true },
    }),
  ])
  const estimate = estimateSessionCost(input, {
    courts: courts.length,
    durationMinutes,
    // Before anyone joins: the expected count, else the slots (the form's "follows your slots"),
    // never 1 player.
    players:
      roster.length ||
      session.expectedPlayers ||
      slotCapacity(courts.length, session.playersPerCourt),
    // D-2026-11-27-01: free roster players leave the break-even head count.
    freePlayers: roster.filter((p) => p.isFree).length,
    inventory,
  })
  return {
    input,
    estimate,
    revision: toDecimalString(row.revision),
    courts: courts.length,
    durationMinutes,
    shuttleLines: input.shuttles.map((line) => ({
      ...line,
      name: inventory.find((i) => i.id === line.inventoryItemId)?.name ?? '',
    })),
  }
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
    if (values.paymentMode === 'custom')
      centavos(values.customFeePerHead, 'customFee', { allowNull: false })
    for (const line of values.shuttles)
      if (!Number.isInteger(line.tubes) || line.tubes <= 0)
        throw new ServiceError('invalid', { shuttles: 'Enter a whole number of tubes.' })
  }
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    if (!['prepared', 'active'].includes(session.state))
      throw new ServiceError('invalid', {
        state: 'The estimate can’t change after the session closes.',
      })
    const existing = await tx.sessionCostEstimate.findUnique({ where: { sessionId } })
    if ((existing ? toDecimalString(existing.revision) : null) !== input.expectedRevision)
      throw new ServiceError('conflict')
    if (!values) {
      if (existing) await tx.sessionCostEstimate.delete({ where: { sessionId } })
      return estimateFor(tx, session)
    }
    const ids = [...new Set(values.shuttles.map((l) => l.inventoryItemId))]
    const owned = await tx.inventoryItem.count({
      where: { clubId: context.clubId, id: { in: ids }, removedAt: null },
    })
    if (owned !== ids.length)
      throw new ServiceError('invalid', { shuttles: 'Choose items from this club’s inventory.' })
    const data: Prisma.SessionCostEstimateUncheckedUpdateInput = {
      courtFeePerCourtHourMinor: values.courtFeePerCourtHour,
      entranceFeePerHeadMinor: values.entranceFeePerHead,
      paymentMode: values.paymentMode,
      customFeePerHeadMinor: values.paymentMode === 'custom' ? values.customFeePerHead : null,
    }
    if (existing) {
      await tx.sessionShuttlePlanLine.deleteMany({ where: { sessionId } })
      await tx.sessionCostEstimate.update({
        where: { sessionId },
        data: { ...data, revision: { increment: 1 } },
      })
    } else
      await tx.sessionCostEstimate.create({
        data: {
          ...(data as Prisma.SessionCostEstimateUncheckedCreateInput),
          sessionId,
          clubId: context.clubId,
        },
      })
    for (const [position, line] of values.shuttles.entries())
      await tx.sessionShuttlePlanLine.create({
        data: {
          clubId: context.clubId,
          sessionId,
          inventoryItemId: line.inventoryItemId,
          tubes: line.tubes,
          position,
        },
      })
    await tx.queueSession.update({ where: { id: sessionId }, data: { revision: { increment: 1 } } })
    return estimateFor(tx, session)
  })
}

/**
 * Payments are open in prepared, active and completed sessions; never invalid, mid-finalization or
 * cancelled (a cancelled session keeps its marks, read-only; refunds happen outside ROTRA).
 */
function requirePaymentsOpen(session: QueueSession) {
  if (['invalid', 'finalizing', 'cancelled'].includes(session.state))
    throw new ServiceError('invalid', { state: 'Payments are not available for this session.' })
}

/**
 * Q-MONEY read. Recorded amounts received come from the marks, never recomputed from today's fee;
 * status and totals compare them with today's amount due (#479).
 */
export async function readSessionPayments(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  if (session.state === 'invalid') return null
  await requireSessionAccess(context, session)
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, sessionId)
    const { input, estimate } = await estimateFor(tx, session)
    const amountDue = amountDuePerHead(estimate)
    // #1013: each live entry's own mark (unless frozen into a transfer it sent) plus the cash and
    // waivers an approved transfer carried into it. Senders are off the roster: cash counts once.
    const ledger = await slotLedger(tx, sessionId)
    const entries = roster.map((p) => ({ p, payment: ledger.paymentOf(p.id, amountDue) }))
    const players = entries
      .map(({ p, payment }) => {
        const own = payment.frozen ? undefined : ledger.markOf(p.id)
        const transfer = ledger.transferOf(payment)
        const approvedAt = payment.chain[payment.chain.length - 1]?.decidedAt ?? 0
        const at = Math.max(own?.markedAt.getTime() ?? 0, transfer ? approvedAt : 0)
        const refund = ledger.refundOf(p.id)
        return {
          sessionPlayerId: p.id,
          clubPlayerId: p.clubPlayerId,
          name: p.nameSnapshot,
          // D-2026-11-27-01: plays free (owes nothing, left out of the split and the totals)
          free: p.isFree && !payment.mark,
          paid: payment.mark
            ? {
                // A legacy own mark with no amount stays null (paid in full at today's due, #479).
                amount: toMoney(payment.mark.amountMinor, own?.currency ?? 'PHP'),
                at: toIso(new Date(at)),
              }
            : null,
          transfer,
          // #1014: the manual full refund recorded for this player; `paid.amount` is net of it.
          refund: refund
            ? { amount: toMoney(refund.amountMinor, refund.currency), at: toIso(refund.refundedAt) }
            : null,
        }
      })
      .sort((a, b) => Number(!!a.paid) - Number(!!b.paid) || a.name.localeCompare(b.name))
    return {
      players,
      amountDue,
      dueBasis: input?.paymentMode ?? 'break_even',
      entranceFeeIncluded: estimate?.entranceFeePerHead ?? null,
      totals: paymentTotals({
        // `amountMinor` is the cash received (#479; a legacy null counts as today's amount due),
        // `waivedMinor` a transferred slot's waivers (#1013), never collected.
        // #1014: `amountMinor` is net of a manual refund (net kept); `refundedMinor` is the refund.
        // D-2026-11-27-01: free players are left out of Paid X/Y, still due and to reimburse.
        marks: entries.flatMap(({ payment }) =>
          payment.mark ? [{ ...payment.mark, refundedMinor: payment.refundedMinor }] : [],
        ),
        total: entries.filter(({ p, payment }) => !(p.isFree && !payment.mark)).length,
        amountDue,
        cost: estimate?.total ?? null,
        free: entries.filter(({ p, payment }) => p.isFree && !payment.mark).length,
      }),
    }
  })
}

/**
 * Payment status share on the public page (#1010; owner decision 2026-11-22, #1015): amounts per
 * confirmed roster person with names masked here (`maskPublicName`, #475), so a full name never
 * leaves the server. Roster only (no waitlist, no no-shows); no contacts, ids, times or costs. A
 * cancelled or invalid session, an unknown slug or a removed page reveals nothing.
 */
export async function readPublicPaymentStatus(slug: string) {
  const session = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    include: { publication: { select: { state: true } } },
  })
  if (!session || session.publication?.state === 'deleted') throw new ServiceError('not_found')
  if (session.state === 'invalid' || session.state === 'cancelled') return null
  return prisma.$transaction(async (tx) => {
    const roster = await liveRoster(tx, session.id)
    const { estimate } = await estimateFor(tx, session)
    const amountDue = amountDuePerHead(estimate)
    // #1013: a transferred slot's carried cash counts for its holder once; waivers are never cash.
    const ledger = await slotLedger(tx, session.id)
    const rows = roster
      .map((p) => ({ p, payment: ledger.paymentOf(p.id, amountDue) }))
      // D-2026-11-27-01: free players owe nothing, so the share leaves them out.
      .filter(({ p, payment }) => !(p.isFree && !payment.mark))
      .map(({ p, payment }) => {
        return {
          name: maskPublicName(p.nameSnapshot),
          // A legacy mark with no amount counts as paid in full at today's amount due (#479).
          receivedMinor: payment.mark ? receivedAmount(payment.mark, amountDue) : null,
          waivedMinor: payment.mark?.waivedMinor ?? 0,
          viaTransfer: payment.chain.length > 0,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    return { amountDue, rows }
  })
}

/**
 * What a paid tick means when no fee is set (amount due null) is still open (#245), so no such tick
 * is recorded: the command is refused rather than storing a null or zero amount.
 */
const NO_FEE_TICK = 'Paid ticks with no fee set aren’t connected to saved data yet.'

/**
 * One tick or untick inside the caller's transaction. A tick records `amountMinor` (the amount due
 * now, kept as the amount received, #479) under `operationId`; an existing mark is returned
 * unchanged, so a duplicate applies once and a later fee change never rewrites it. Unticking deletes the mark.
 */
async function applyMark(
  tx: Tx,
  context: ClubContext,
  entry: SessionPlayer,
  input: {
    operationId: string
    paid: boolean
    amountMinor: number | null
    deviceId?: string | null
  },
) {
  const key = {
    sessionId_sessionPlayerId: { sessionId: entry.sessionId, sessionPlayerId: entry.id },
  }
  const mark = await tx.sessionPaymentMark.findUnique({ where: key })
  // #1013: a slot paid through a transfer is already Paid (a tick is a no-op, never a second
  // payment); unticking it, or a mark frozen into a transfer, is refused.
  const ledger = await slotLedger(tx, entry.sessionId)
  // #1014: a refunded entry's payment is history (its marks are frozen): never changed or re-paid.
  if (ledger.isRefunded(entry.id))
    throw new ServiceError('conflict', { payment: PAYMENT_REFUNDED_LOCKED_ERROR })
  if (ledger.isLocked(entry.id)) {
    if (input.paid && ledger.isCarried(entry.id))
      return { paid: true, amount: mark ? toMoney(mark.amountMinor, mark.currency) : null }
    throw new ServiceError('conflict', { payment: TRANSFER_PAYMENT_LOCKED_ERROR })
  }
  if (input.paid) {
    if (mark) return { paid: true, amount: toMoney(mark.amountMinor, mark.currency) }
    if (isOffRoster(entry))
      throw new ServiceError('invalid', { player: 'Player not in this session.' })
    if (input.amountMinor === null) throw new ServiceError('invalid', { fee: NO_FEE_TICK })
    const created = await tx.sessionPaymentMark.create({
      data: {
        sessionId: entry.sessionId,
        sessionPlayerId: entry.id,
        clubId: context.clubId,
        amountMinor: input.amountMinor,
        markedAt: new Date(),
        sourceOperationId: input.operationId,
        actorClubId: context.clubId,
        deviceId: input.deviceId ?? null,
      },
    })
    // D-2026-11-27-01: recording cash for a free player makes them a payer again.
    if (entry.isFree)
      await tx.sessionPlayer.update({ where: { id: entry.id }, data: { isFree: false } })
    return { paid: true, amount: toMoney(created.amountMinor, created.currency) }
  }
  if (mark) await tx.sessionPaymentMark.delete({ where: key })
  return { paid: false, amount: null }
}

/**
 * #1013: the entry's payment is part of a slot transfer's history (see `slotLedger`); #1014: or it
 * was refunded. Returns the refusal to send, or null.
 */
async function paymentLockError(tx: Tx, entry: SessionPlayer) {
  const ledger = await slotLedger(tx, entry.sessionId)
  if (ledger.isRefunded(entry.id)) return PAYMENT_REFUNDED_LOCKED_ERROR
  return ledger.isLocked(entry.id) ? TRANSFER_PAYMENT_LOCKED_ERROR : null
}

/**
 * Q-MONEY · tick paid / untick one roster entry, recording the amount due at that moment. The mark
 * keys on the roster entry, which is released (not deleted), so it survives demotion and shows
 * again on restoration. A tick with no fee set is refused until #245 defines it.
 */
export async function setPaid(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; sessionPlayerId: string; paid: boolean; deviceId?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requirePaymentsOpen(session)
    const entry = await tx.sessionPlayer.findUnique({ where: { id: input.sessionPlayerId } })
    if (!entry || entry.sessionId !== sessionId) throw new ServiceError('not_found')
    const { estimate } = await estimateFor(tx, session)
    return applyMark(tx, context, entry, { ...input, amountMinor: amountDuePerHead(estimate) })
  })
}

/**
 * Q-MONEY · the payment switches' desired end states (#300), keyed by club player, in one
 * transaction: a refused mark rolls the whole batch back. Each mark's operation ID is derived from
 * the batch's command ID. Another club's or an unknown player is `not_found`.
 */
export async function setPaymentMarks(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; marks: { clubPlayerId: string; paid: boolean }[] },
) {
  if (!UUID.test(input.operationId)) throw new ServiceError('invalid')
  const wanted = new Map<string, boolean>()
  for (const mark of input.marks) {
    if (!UUID.test(mark.clubPlayerId)) throw new ServiceError('not_found')
    if (typeof mark.paid !== 'boolean') throw new ServiceError('invalid')
    wanted.set(mark.clubPlayerId, mark.paid)
  }
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requirePaymentsOpen(session)
    const { estimate } = await estimateFor(tx, session)
    const amountMinor = amountDuePerHead(estimate)
    const marks = []
    for (const [clubPlayerId, paid] of wanted) {
      const entry = await tx.sessionPlayer.findUnique({
        where: { sessionId_clubPlayerId: { sessionId, clubPlayerId } },
      })
      if (!entry || entry.clubId !== context.clubId) throw new ServiceError('not_found')
      const operationId = await derivedId(input.operationId, clubPlayerId)
      const result = await applyMark(tx, context, entry, { operationId, paid, amountMinor })
      marks.push({ clubPlayerId, ...result })
    }
    return { count: wanted.size, marks }
  })
}

/**
 * Q-MONEY · #479 the amount received from one roster entry, keyed by club player. A positive amount
 * replaces the mark (amount, time, operation ID); 0 removes it (not paid). A retry of the same
 * operation returns the saved mark unchanged. Pricing changes never rewrite it. Unlike a quick tick,
 * an explicit amount is accepted with no fee set: the amount itself is known.
 */
export async function setPaymentAmount(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; clubPlayerId: string; amountMinor: number },
) {
  if (!UUID.test(input.operationId)) throw new ServiceError('invalid')
  if (!UUID.test(input.clubPlayerId)) throw new ServiceError('not_found')
  const amountMinor = centavos(input.amountMinor, 'amount', { allowNull: false }) ?? 0
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requirePaymentsOpen(session)
    const entry = await tx.sessionPlayer.findUnique({
      where: { sessionId_clubPlayerId: { sessionId, clubPlayerId: input.clubPlayerId } },
    })
    if (!entry || entry.clubId !== context.clubId) throw new ServiceError('not_found')
    const key = {
      sessionId_sessionPlayerId: { sessionId: entry.sessionId, sessionPlayerId: entry.id },
    }
    const mark = await tx.sessionPaymentMark.findUnique({ where: key })
    if (mark && mark.sourceOperationId === input.operationId)
      return { paid: true, amount: toMoney(mark.amountMinor, mark.currency) }
    if (isOffRoster(entry))
      throw new ServiceError('invalid', { player: 'Player not in this session.' })
    const locked = await paymentLockError(tx, entry)
    if (locked) throw new ServiceError('conflict', { payment: locked })
    if (mark) await tx.sessionPaymentMark.delete({ where: key })
    if (!amountMinor) return { paid: false, amount: null }
    const created = await tx.sessionPaymentMark.create({
      data: {
        sessionId: entry.sessionId,
        sessionPlayerId: entry.id,
        clubId: context.clubId,
        amountMinor,
        markedAt: new Date(),
        sourceOperationId: input.operationId,
        actorClubId: context.clubId,
      },
    })
    // D-2026-11-27-01: recording cash for a free player makes them a payer again.
    if (entry.isFree)
      await tx.sessionPlayer.update({ where: { id: entry.id }, data: { isFree: false } })
    return { paid: true, amount: toMoney(created.amountMinor, created.currency) }
  })
}

/**
 * D-2026-11-27-01 · **Plays free** on one roster entry, keyed by club player. A free entry owes
 * nothing and leaves the break-even head count. Payments are a guide only, so setting a paid entry
 * free deletes its own payment mark (nothing to reimburse). Refused for a slot paid through a slot
 * transfer or refunded: that payment is history. Idempotent: setting the current value is a no-op.
 */
export async function setPlayerFree(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; clubPlayerId: string; free: boolean },
) {
  if (!UUID.test(input.operationId)) throw new ServiceError('invalid')
  if (!UUID.test(input.clubPlayerId)) throw new ServiceError('not_found')
  if (typeof input.free !== 'boolean') throw new ServiceError('invalid')
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requirePaymentsOpen(session)
    const entry = await tx.sessionPlayer.findUnique({
      where: { sessionId_clubPlayerId: { sessionId, clubPlayerId: input.clubPlayerId } },
    })
    if (!entry || entry.clubId !== context.clubId) throw new ServiceError('not_found')
    if (isOffRoster(entry))
      throw new ServiceError('invalid', { player: 'Player not in this session.' })
    if (input.free === entry.isFree) return { free: entry.isFree, cleared: false }
    let cleared = false
    if (input.free) {
      if (await paymentLockError(tx, entry))
        throw new ServiceError('conflict', { payment: FREE_PAYMENT_LOCKED_ERROR })
      const deleted = await tx.sessionPaymentMark.deleteMany({
        where: { sessionId, sessionPlayerId: entry.id },
      })
      cleared = deleted.count > 0
    }
    await tx.sessionPlayer.update({ where: { id: entry.id }, data: { isFree: input.free } })
    return { free: input.free, cleared }
  })
}

/**
 * Q-MONEY · Mark all paid: ticks every live unpaid entry at the current amount, once. Refused with
 * no fee set while any entry is unpaid (#245).
 */
export async function markAllPaid(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; deviceId?: string | null },
) {
  if (!UUID.test(input.operationId)) throw new ServiceError('invalid')
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    requirePaymentsOpen(session)
    const roster = await liveRoster(tx, sessionId)
    const { estimate } = await estimateFor(tx, session)
    const amountMinor = amountDuePerHead(estimate)
    const ledger = await slotLedger(tx, sessionId)
    let count = 0
    for (const entry of roster) {
      const exists = await tx.sessionPaymentMark.findUnique({
        where: { sessionId_sessionPlayerId: { sessionId, sessionPlayerId: entry.id } },
      })
      if (exists) continue
      // #1013: a slot paid through a transfer is already Paid; never a second payment.
      if (ledger.isLocked(entry.id)) continue
      // D-2026-11-27-01: a free player owes nothing.
      if (entry.isFree) continue
      await applyMark(tx, context, entry, {
        operationId: await derivedId(input.operationId, entry.id),
        paid: true,
        amountMinor,
        deviceId: input.deviceId,
      })
      count++
    }
    return { count }
  })
}

/**
 * #1014 · **Record refund** on a cancelled session's **Refund everyone who paid** list (owner
 * decision 2026-11-22, #1015; D-2026-11-22-06). ROTRA moves no money: one append-only
 * `session_payment_refunds` row records that the Queue Master handed the player's whole cash back
 * outside ROTRA (own cash plus cash carried in by transfers; never a waiver). The payment marks are
 * never changed (a trigger freezes them). Idempotent per player: a retry, or a second tap, returns
 * the refund already recorded. Refused unless the session is cancelled, when there is no cash to
 * refund, and when the amount differs from the one the Queue Master was shown.
 */
export async function recordSessionRefund(
  context: ClubContext,
  sessionId: string,
  input: { sessionPlayerId: unknown; expectedAmountMinor: unknown },
) {
  if (typeof input.sessionPlayerId !== 'string' || !UUID.test(input.sessionPlayerId))
    throw new ServiceError('not_found')
  const expected = input.expectedAmountMinor
  if (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0)
    throw new ServiceError('invalid', { expectedAmountMinor: 'Enter the refund in centavos.' })
  const sessionPlayerId = input.sessionPlayerId
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    await requireSessionAccess(context, session, tx)
    if (session.state !== 'cancelled')
      throw new ServiceError('conflict', { refund: REFUND_NOT_CANCELLED_ERROR })
    const entry = await tx.sessionPlayer.findUnique({ where: { id: sessionPlayerId } })
    if (!entry || entry.sessionId !== sessionId || entry.clubId !== context.clubId)
      throw new ServiceError('not_found')
    const ledger = await slotLedger(tx, sessionId)
    const done = ledger.refundOf(entry.id)
    if (done) return { message: sessionRefundToast(entry.nameSnapshot, done.amountMinor) }
    // The cancelled roster is the list (released entries and no-shows are not on it).
    if (isOffRoster(entry))
      throw new ServiceError('invalid', { player: 'Player not in this session.' })
    const { estimate } = await estimateFor(tx, session)
    const amountDue = amountDuePerHead(estimate)
    const payment = ledger.paymentOf(entry.id, amountDue)
    const amount = fullRefundAmount(receivedAmount(payment.mark, amountDue))
    if (amount <= 0) throw new ServiceError('conflict', { refund: REFUND_NOTHING_TO_REFUND_ERROR })
    if (expected !== amount)
      throw new ServiceError('conflict', { refund: REFUND_CHANGED_ERROR(formatPeso(amount)) })
    await tx.sessionPaymentRefund.create({
      data: {
        id: await derivedId(entry.id, 'refund'),
        clubId: context.clubId,
        sessionId,
        sessionPlayerId: entry.id,
        reason: 'session_cancelled',
        amountMinor: amount,
        refundedAt: new Date(),
      },
    })
    return { message: sessionRefundToast(entry.nameSnapshot, amount) }
  })
}
