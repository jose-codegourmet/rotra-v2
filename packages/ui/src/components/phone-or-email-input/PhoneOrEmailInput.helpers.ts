/** Port of the prototype maskPhoneInput. This is display formatting, not validation. */
export function formatIdentifier(value: string, mode: 'phone' | 'phone-or-email') {
  if (mode === 'phone-or-email' && (!/^\s*\+?[\d\s()-]*$/.test(value) || !/\d/.test(value)))
    return value
  const digits = value.replace(/\D/g, '')
  if (!digits) return mode === 'phone' ? (/^\s*\+/.test(value) ? '+' : '') : value
  if (/^\s*\+/.test(value) || digits.startsWith('63')) {
    const number = digits.slice(0, 12)
    return `+${[number.slice(0, 2), number.slice(2, 5), number.slice(5, 8), number.slice(8)].filter(Boolean).join(' ')}`
  }
  const number = digits.slice(0, 11)
  return [number.slice(0, 4), number.slice(4, 7), number.slice(7)].filter(Boolean).join(' ')
}
export function countDigitsBeforeCaret(value: string, caret: number) {
  return value.slice(0, caret).replace(/\D/g, '').length
}
export function caretAfterDigits(value: string, count: number) {
  let caret = 0,
    seen = 0
  while (caret < value.length && seen < count) {
    if (/\d/.test(value.charAt(caret))) seen++
    caret++
  }
  return caret
}
