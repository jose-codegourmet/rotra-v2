export const matchRequestKeys = {
  all: ['match-request'] as const,
  /** The QM's Requests read model for one session (`useSessionRequests`) */
  sessionRequests: (sessionId: string) => ['match-request', 'session-requests', sessionId] as const,
}
