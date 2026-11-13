export const clubPlayerKeys = {
  all: ['club-player'] as const,
  stats: (clubId: string) => ['club-player', 'stats', clubId] as const,
  list: (id: string) => ['club-player', 'list', id] as const,
  detail: (id: string) => ['club-player', 'detail', id] as const,
  /** Stats · YEAR on the Queue Master's player profile dialog */
  yearStats: (id: string) => ['club-player', 'year-stats', id] as const,
}
