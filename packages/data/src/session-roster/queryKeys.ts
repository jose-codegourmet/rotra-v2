export const sessionRosterKeys = {
  all: ['session-roster'] as const,
  list: (id: string) => ['session-roster', 'list', id] as const,
  detail: (id: string) => ['session-roster', 'detail', id] as const,
  noShows: (id: string) => ['session-roster', 'no-shows', id] as const,
  /** Player lookup by exact RTR ID or email (Add player › Player Information) */
  lookup: (q: string) => ['session-roster', 'lookup', q.trim().toLowerCase()] as const,
  /** Requests › Join hints per pending request */
  joinRequestHints: (id: string) => ['session-roster', 'join-request-hints', id] as const,
}
