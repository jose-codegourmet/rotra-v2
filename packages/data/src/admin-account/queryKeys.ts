export const adminAccountKeys = {
  all: ['admin-account'] as const,
  session: () => ['admin-account', 'session'] as const,
}
