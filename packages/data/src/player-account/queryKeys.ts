export const playerAccountKeys = {
  all: ['player-account'] as const,
  guestRegistration: (clubId: string) => ['player-account', 'guest-registration', clubId] as const,
  me: (playerId: string) => ['player-account', 'me', playerId] as const,
  claimLink: (token: string) => ['player-account', 'claim-link', token] as const,
  resetLink: (token: string) => ['player-account', 'reset-link', token] as const,
  /** The clubs' saved versions of the person behind a Google email (registration) */
  unclaimedIdentities: (email: string) =>
    ['player-account', 'unclaimed-identities', email.trim().toLowerCase()] as const,
}
