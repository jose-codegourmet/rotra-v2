export const sessionRosterKeys = {
  all: ['session-roster'] as const,
  list: (id: string) => ['session-roster', 'list', id] as const,
  detail: (id: string) => ['session-roster', 'detail', id] as const,
  noShows: (id: string) => ['session-roster', 'no-shows', id] as const,
}
