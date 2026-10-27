export const matchKeys = {
  all: ['match'] as const,
  list: (id: string) => ['match', 'list', id] as const,
  detail: (id: string) => ['match', 'detail', id] as const,
}
