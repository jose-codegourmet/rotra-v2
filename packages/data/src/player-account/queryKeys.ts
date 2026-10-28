export const playerAccountKeys = {
  all: ['player-account'] as const,
  me: (playerId: string) => ['player-account', 'me', playerId] as const,
  resetLink: (token: string) => ['player-account', 'reset-link', token] as const,
}
