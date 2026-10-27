export const clubVenueKeys = {
  all: ['club-venue'] as const,
  list: (id: string) => ['club-venue', 'list', id] as const,
  detail: (id: string) => ['club-venue', 'detail', id] as const,
}
