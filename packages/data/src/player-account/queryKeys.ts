export const playerAccountKeys = {
  all: ['player-account'] as const,
  resetLink: (token: string) => ['player-account', 'reset-link', token] as const,
}
