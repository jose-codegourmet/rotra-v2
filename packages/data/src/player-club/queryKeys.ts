export const playerClubKeys = {
  all: ['player-club'] as const,
  mine: (id: string) => ['player-club', id] as const,
}
