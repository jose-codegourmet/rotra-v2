import { describe, expect, it } from 'vitest'
import { formatPhoneForDisplay, phoneField } from './phone'

describe('PH mobile parsing', () => {
  it.each([
    '0917 555 0142',
    '+63 917 555 0142',
    '639175550142',
    '0917-555-0142',
  ])('normalizes %s to E.164', (value) => expect(phoneField.parse(value)).toBe('+639175550142'))
  it.each([
    '',
    '9175550142',
    '+1 917 555 0142',
    '0917555014',
    '091755501422',
    'text09175550142',
  ])('rejects %s without guessing a country or truncating', (value) =>
    expect(phoneField.safeParse(value).success).toBe(false))
  it('groups partial and complete inputs without changing the parsed identity', () => {
    expect(formatPhoneForDisplay('09175')).toBe('0917 5')
    expect(formatPhoneForDisplay('+639175550142')).toBe('+63 917 555 0142')
    expect(phoneField.parse(formatPhoneForDisplay('09175550142'))).toBe('+639175550142')
    expect(formatPhoneForDisplay('migs@example.com')).toBe('migs@example.com')
  })
})
