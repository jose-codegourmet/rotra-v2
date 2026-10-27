export const queueSessionKeys = {
  all: ['queue-session'] as const,
  list: (id: string) => ['queue-session', 'list', id] as const,
  detail: (id: string) => ['queue-session', 'detail', id] as const,
}
