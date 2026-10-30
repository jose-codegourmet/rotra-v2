import {
  type ClubPriceInput,
  type ClubPriceValues,
  formatClubPriceLine,
} from '@rotra/schema/club-price'

/** rotra-admin.html priceLine(): "₱1,500 a month · ₱15,000 a year (17% off)", or "Free (tester club)". */
export function clubPriceLine(price: ClubPriceValues) {
  return formatClubPriceLine(
    price.pricing === 'free'
      ? { pricing: 'free', monthlyMinor: price.monthly ?? 0, yearlyMinor: price.yearly ?? 0 }
      : { pricing: 'paid', monthlyMinor: price.monthly, yearlyMinor: price.yearly },
  )
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
