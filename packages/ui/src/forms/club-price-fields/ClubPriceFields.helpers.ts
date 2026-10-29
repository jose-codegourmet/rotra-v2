import {
  type ClubPriceInput,
  type ClubPriceValues,
  yearlySavingPercent,
} from '@rotra/schema/club-price'
import { formatPeso } from '@rotra/schema/money'

/** rotra-admin.html priceLine(): "₱1,500 a month · ₱15,000 a year (17% off)", or "Free (tester club)". */
export function clubPriceLine(price: ClubPriceValues) {
  if (price.pricing === 'free') return 'Free (tester club)'
  const saving = yearlySavingPercent(price.monthly, price.yearly)
  return `${formatPeso(price.monthly)} a month · ${formatPeso(price.yearly)} a year${saving > 0 ? ` (${saving}% off)` : ''}`
}

/**
 * A stored club price → what the price fields start from (peso text). A free club keeps its last
 * paid amounts, so switching it back to Paid starts from them (rotra-admin.html openPrice).
 */
export function clubPriceInputFrom(price: {
  pricing: 'paid' | 'free'
  monthlyMinor: number | null
  yearlyMinor: number | null
}): ClubPriceInput {
  const pesos = (minor: number | null) => (minor ? String(minor / 100) : '')
  return {
    pricing: price.pricing,
    monthly: pesos(price.monthlyMinor),
    yearly: pesos(price.yearlyMinor),
  }
}
