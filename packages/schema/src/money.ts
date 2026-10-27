import { z } from 'zod'

/**
 * Accepts nonnegative safe integer centavos (number), or decimal pesos (string, up to two places).
 * Peso strings may have comma thousands groups; parses exactly to integer centavos, never rounds.
 * Empty input is invalid; optional forms should omit the value instead of treating it as zero.
 */
export const moneyField = z.union([
  z.number().int().nonnegative(),
  z
    .string()
    .trim()
    .regex(
      /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/,
      'Enter a peso amount with up to two decimals.',
    )
    .transform((value, context) => {
      const [pesos = '0', fraction = ''] = value.replace(/,/g, '').split('.')
      const centavos = BigInt(pesos) * 100n + BigInt(fraction.padEnd(2, '0'))
      if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) {
        context.addIssue({ code: 'custom', message: 'Amount is too large.' })
        return z.NEVER
      }
      return Number(centavos)
    }),
])
