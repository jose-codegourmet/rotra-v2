export const deviceKeys = {
  all: ['device'] as const,
  list: (id: string) => ['device', 'list', id] as const,
  detail: (id: string) => ['device', 'detail', id] as const,
}
