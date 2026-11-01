import 'server-only'

/**
 * Comparison key behind the unique club name (`clubs.name_key`): NFKC, trimmed, inner whitespace
 * collapsed, lowercased. Proposal only; the approved comparison is pending #245.
 */
export function clubNameKey(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Normalized club sign-in username (`club_accounts.username`): trimmed and lowercased. */
export function normalizeClubUsername(username: string): string {
  return username.trim().toLowerCase()
}

/**
 * The provider login email behind a club username. PROPOSAL under #244: Supabase password sign-in
 * needs an email or phone, so a club username maps to a reserved, undeliverable address the club
 * never sees. It signs in with the username only.
 */
export const CLUB_LOGIN_DOMAIN = 'clubs.rotra.invalid'
export function clubLoginEmail(username: string): string {
  return `${normalizeClubUsername(username)}@${CLUB_LOGIN_DOMAIN}`
}
