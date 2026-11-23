export const sessionHostKeys = {
  all: ['session-host'] as const,
  list: (sessionId: string) => ['session-host', 'list', sessionId] as const,
}
