export const clubPlayerKeys = {
  all: ['club-player'] as const,
  list: (id: string) => ['club-player', 'list', id] as const,
  detail: (id: string) => ['club-player', 'detail', id] as const,
}
