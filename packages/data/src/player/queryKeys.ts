export const playerKeys = {
  mySessions: (id: string) => ['player', 'my-sessions', id] as const,
  share: (id: string, sessionId?: string) => ['player', 'share', id, sessionId ?? null] as const,
  profileShare: (id: string) => ['player', 'share-profile', id] as const,
  all: ['player'] as const,
  profile: (playerId: string) => ['player', 'profile', playerId] as const,
  rank: (playerId: string) => ['player', 'rank', playerId] as const,
  games: (playerId: string) => ['player', 'games', playerId] as const,
  byRtrId: (rtrId: string) => ['player', 'rtr-id', rtrId.trim().toUpperCase()] as const,
}
