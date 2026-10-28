export const queueSessionKeys = {
  all: ['queue-session'] as const,
  list: (id: string) => ['queue-session', 'list', id] as const,
  detail: (id: string) => ['queue-session', 'detail', id] as const,
  doneReview: (id: string) => ['queue-session', 'done-review', id] as const,
  finalization: (id: string) => ['queue-session', 'finalization', id] as const,
  record: (id: string) => ['queue-session', 'record', id] as const,
}
