export const sessionResultKeys = {
  all: ['session-result'] as const,
  snapshot: (id: string) => ['session-result', 'snapshot', id] as const,
  publication: (id: string) => ['session-result', 'publication', id] as const,
}
