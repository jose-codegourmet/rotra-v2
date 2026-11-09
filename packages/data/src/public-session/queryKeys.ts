export const publicSessionKeys = {
  all: ['public-session'] as const,
  detail: (slug: string) => ['public-session', 'detail', slug] as const,
  /** The signed-in version of the shared snapshot (names, uncapped roster, Courts now, Queue) */
  signedIn: (slug: string, playerId: string) =>
    ['public-session', 'signed-in', slug, playerId] as const,
  /** The small personal part: My night, own standing, requests */
  myNight: (slug: string, playerId: string) =>
    ['public-session', 'my-night', slug, playerId] as const,
  myRequest: (slug: string) => ['public-session', 'my-request', slug] as const,
  /** This Player's Session invite code for the session (made on first read, then stable) */
  inviteCode: (slug: string, playerId: string) =>
    ['public-session', 'invite-code', slug, playerId] as const,
}
