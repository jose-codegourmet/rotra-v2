import type { InventoryItem } from '../inventory/inventory.types'
import type { SessionPaymentMark } from '../session-payment/sessionPayment.types'
import type { SessionCostContext, SessionCostInput, SessionCostResult } from './sessionCost.types'

/** Money stays in integer centavos. Court division rounds to nearest centavo (owner decision). */
export function estimateSessionCost(
  values: SessionCostInput,
  context: SessionCostContext,
): SessionCostResult {
  const players = Math.max(1, context.players || 1)
  const numerator =
    BigInt(values.courtFeePerCourtHour ?? 0) *
    BigInt(context.courts) *
    BigInt(context.durationMinutes)
  const court = Number((numerator + 30n) / 60n)
  // Q10.5 uses current inventory prices as in the prototype. Price snapshotting remains
  // open in docs/database_design/product/queue/modules/financials-inventory.md.
  const shuttle = values.shuttles.reduce(
    (sum, line) =>
      sum +
      line.tubes *
        (context.inventory.find((i) => i.id === line.inventoryItemId)?.unitCostMinor ?? 0),
    0,
  )
  const entranceFeePerHead = values.entranceFeePerHead ?? 0
  const entrance = entranceFeePerHead * players
  const total = court + shuttle + entrance
  const breakEven = Math.ceil(total / (players * 100)) * 100
  const isCustom = values.paymentMode === 'custom'
  const perHead = isCustom ? (values.customFeePerHead ?? 0) : breakEven
  const collect = perHead * players
  const diff = collect - total
  const kind =
    total === 0
      ? 'no_costs'
      : !isCustom || diff === 0
        ? 'breaks_even'
        : diff > 0
          ? 'profit'
          : 'loss'
  return {
    players,
    court,
    shuttle,
    entrance,
    entranceFeePerHead,
    total,
    breakEven,
    perHead,
    isCustom,
    collect,
    result: { kind, amount: Math.abs(diff) },
  }
}
export function defaultShuttlePlan(
  context: Pick<SessionCostContext, 'courts' | 'durationMinutes'> & {
    inventory: Pick<InventoryItem, 'id' | 'category' | 'removedAt'>[]
  },
) {
  const first = context.inventory.find((i) => i.category === 'shuttlecocks' && !i.removedAt)
  return first
    ? [
        {
          inventoryItemId: first.id,
          tubes: Math.max(1, Math.round((context.courts * context.durationMinutes) / 90)),
        },
      ]
    : []
}
/** No saved estimate means no fee, including when paid ticks have been recorded. */
export function amountDuePerHead(estimate: SessionCostResult | null): number | null {
  return estimate?.perHead ?? null
}
export function paymentTotals({
  marks,
  total,
  amountDue,
  cost,
}: {
  marks: Pick<SessionPaymentMark, 'amountMinor'>[]
  total: number
  amountDue: number | null
  cost: number | null
}) {
  const collected = marks.reduce((sum, m) => sum + m.amountMinor, 0)
  return {
    paid: marks.length,
    total,
    collected,
    stillDue: amountDue === null ? null : (total - marks.length) * amountDue,
    againstCosts: cost === null ? null : collected - cost,
    cost,
  }
}
/** Empty/zero shuttle lines are ignored, while an explicitly entered zero fee remains an estimate. */
export function normalizeSessionCost(
  values: SessionCostInput | null | undefined,
): SessionCostInput | null {
  if (!values) return null
  const shuttles = values.shuttles.filter((line) => line.inventoryItemId && line.tubes > 0)
  if (
    values.courtFeePerCourtHour === null &&
    values.entranceFeePerHead === null &&
    !shuttles.length &&
    values.paymentMode === 'break_even'
  )
    return null
  return {
    courtFeePerCourtHour: values.courtFeePerCourtHour,
    entranceFeePerHead: values.entranceFeePerHead,
    paymentMode: values.paymentMode,
    shuttles,
    customFeePerHead: values.paymentMode === 'custom' ? values.customFeePerHead : null,
  }
}
