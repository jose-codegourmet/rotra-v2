export const playerKeys = {
  all: ['player'] as const,
  profile: (playerId: string) => ['player', 'profile', playerId] as const,
  rank: (playerId: string) => ['player', 'rank', playerId] as const,
  games: (playerId: string) => ['player', 'games', playerId] as const,
  byRtrId: (rtrId: string) => ['player', 'rtr-id', rtrId.trim().toUpperCase()] as const,
}
