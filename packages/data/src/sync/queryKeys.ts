export const syncKeys = {
  all: ['sync'] as const,
  list: (id: string) => ['sync', 'list', id] as const,
  detail: (id: string) => ['sync', 'detail', id] as const,
}
