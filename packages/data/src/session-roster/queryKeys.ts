export const sessionRosterKeys = {
  all: ['session-roster'] as const,
  list: (id: string) => ['session-roster', 'list', id] as const,
  detail: (id: string) => ['session-roster', 'detail', id] as const,
}
