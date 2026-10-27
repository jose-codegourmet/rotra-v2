import type { AuthAudience } from './auth.types'
export const authKeys = {
  all: ['auth'] as const,
  session: (audience: AuthAudience) => ['auth', audience] as const,
}
