import type { ClubPriceFormInput } from './ClubPriceForm.schema'

/**
 * Empty Paid amounts. The container passes the club's own price instead, through clubPriceInputFrom
 * (@rotra/ui/forms/club-price-fields/helpers), so a free club starts from its last paid price.
 */
export const clubPriceDefaultValues: ClubPriceFormInput = {
  price: { pricing: 'paid', monthly: '', yearly: '' },
}
