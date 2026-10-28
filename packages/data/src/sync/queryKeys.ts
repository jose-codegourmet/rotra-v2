export const syncKeys = {
  all: ['sync'] as const,
  status: () => ['sync', 'status'] as const,
  log: () => ['sync', 'log'] as const,
  integrity: (sessionId: string) => ['sync', 'integrity', sessionId] as const,
  state: () => ['sync', 'state'] as const,
  list: (id: string) => ['sync', 'list', id] as const,
  detail: (id: string) => ['sync', 'detail', id] as const,
}
