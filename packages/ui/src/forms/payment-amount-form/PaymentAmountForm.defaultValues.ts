import type { PaymentAmountFormInput } from './PaymentAmountForm.schema'

export const paymentAmountDefaultValues: PaymentAmountFormInput = { amount: '' }

/** Centavos → the peso text the field shows ("700", "700.50"); null → empty. */
export function pesoText(minor: number | null | undefined) {
  if (minor == null) return ''
  const cents = minor % 100
  return cents
    ? `${Math.trunc(minor / 100)}.${String(cents).padStart(2, '0')}`
    : String(minor / 100)
}

/** Prefill: the amount already received, else the amount due, else empty (#479). */
export function paymentAmountInputFrom(
  received: number | null | undefined,
  amountDue: number | null,
): PaymentAmountFormInput {
  return { amount: pesoText(received ?? amountDue) }
}
