export const playerClubKeys = {
  all: ['player-club'] as const,
  /** One player's clubs (the clubs card, #766) */
  player: (id: string) => ['player-club', id] as const,
}
