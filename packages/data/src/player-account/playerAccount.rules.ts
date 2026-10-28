/** '+639185550377' → '+63 918 ••• ••77': enough for the recipient to recognise, not to reuse. */
export function maskPhone(e164: string) {
  const digits = e164.replace(/\D/g, '')
  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ••• ••${digits.slice(-2)}`
}
