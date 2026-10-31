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
