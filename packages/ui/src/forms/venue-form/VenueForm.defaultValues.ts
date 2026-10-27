import type { VenueFormInput } from './VenueForm.schema'

export const venueFormDefaultValues: VenueFormInput = {
  name: '',
  address: '',
  courtFee: '',
  entranceFee: '',
}

/** Centavos back to the peso text the fee fields show when editing ("350", "1500.50"). */
export function feeToInput(minor: number | null): string {
  if (minor == null) return ''
  const cents = minor % 100
  return cents
    ? `${Math.trunc(minor / 100)}.${String(cents).padStart(2, '0')}`
    : String(minor / 100)
}
