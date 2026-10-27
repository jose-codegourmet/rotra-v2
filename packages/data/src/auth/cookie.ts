import type { AuthAudience, MockSession } from './auth.types'
export const mockCookieName = (audience: AuthAudience) => `rotra-mock-${audience}`
/** Mock-only browser-readable session marker. Never use this as real authentication. */
export function parseMockSession(
  raw: string | undefined,
  audience: AuthAudience,
): MockSession | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw))
    if (!value || typeof value !== 'object' || !('account' in value)) return null
    const account = value.account
    if (
      !account ||
      typeof account !== 'object' ||
      !('id' in account) ||
      !('name' in account) ||
      !('audience' in account)
    )
      return null
    if (
      typeof account.id !== 'string' ||
      !account.id ||
      typeof account.name !== 'string' ||
      account.audience !== audience
    )
      return null
    return { account: { id: account.id, name: account.name, audience } }
  } catch {
    return null
  }
}
