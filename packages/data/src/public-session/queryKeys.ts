export const publicSessionKeys = {
  all: ['public-session'] as const,
  detail: (slug: string) => ['public-session', 'detail', slug] as const,
  myRequest: (slug: string) => ['public-session', 'my-request', slug] as const,
  /** This Player's Session invite code for the session (made on first read, then stable) */
  inviteCode: (slug: string, playerId: string) =>
    ['public-session', 'invite-code', slug, playerId] as const,
}
