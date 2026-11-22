export const trustedHostKeys = {
  all: ['trusted-host'] as const,
  list: (clubId: string) => ['trusted-host', 'list', clubId] as const,
}
