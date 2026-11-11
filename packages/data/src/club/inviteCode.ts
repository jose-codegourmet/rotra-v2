/**
 * Club invite codes for `/register/<clubId>?k=<code>` (D-2026-11-09-08, #712). Pure, so the mock
 * store and the `@rotra/db` club invite service make codes the same way. The alphabet leaves out
 * look-alike characters (I, L, O, 0, 1); stored codes match `^[A-Z0-9]{8,16}$` (`clubs.invite_code`).
 */
export const CLUB_INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Mock codes stay 8 characters; real mode makes 10 (within the 8–12 the service may create). */
export const MOCK_INVITE_CODE_LENGTH = 8
export const REAL_INVITE_CODE_LENGTH = 10

/** A fresh random code that differs from `not` (the code being replaced), without modulo bias. */
export function newClubInviteCode(length: number = REAL_INVITE_CODE_LENGTH, not?: string | null) {
  if (!Number.isInteger(length) || length < 8 || length > 12)
    throw new RangeError('Club invite codes are 8–12 characters.')
  const limit = 256 - (256 % CLUB_INVITE_ALPHABET.length)
  for (;;) {
    let code = ''
    while (code.length < length) {
      for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
        if (byte < limit && code.length < length)
          code += CLUB_INVITE_ALPHABET[byte % CLUB_INVITE_ALPHABET.length]
      }
    }
    if (code !== not) return code
  }
}

/** The `k` a visitor's link carries, trimmed and uppercased; null when it can't be a stored code. */
export function readClubInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return /^[A-Z0-9]{8,16}$/.test(code) ? code : null
}
