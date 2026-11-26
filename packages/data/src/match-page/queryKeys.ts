export const matchPageKeys = {
  all: ['match-page'] as const,
  page: (matchId: string) => ['match-page', matchId] as const,
}
