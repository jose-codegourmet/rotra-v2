/**
 * The invite page's own route, the one /login receives as `returnTo` (see
 * `login/_components/sign-in/inviteContext.ts`): `/register/<clubId>[?session=<slug>&invite=<code>&k=<clubCode>]`,
 * or `/register` for the Admin link.
 */
export function inviteRoute(link: {
  clubId: string
  sessionSlug?: string
  sessionInviteCode?: string
  clubInviteCode?: string
}) {
  if (!link.clubId) return '/register'
  const query = new URLSearchParams()
  if (link.sessionSlug) query.set('session', link.sessionSlug)
  if (link.sessionInviteCode) query.set('invite', link.sessionInviteCode)
  if (link.clubInviteCode) query.set('k', link.clubInviteCode)
  const text = query.toString()
  return `/register/${encodeURIComponent(link.clubId)}${text ? `?${text}` : ''}`
}
