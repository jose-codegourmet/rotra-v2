import 'server-only'

/**
 * `mock` (default): the in-memory mock store and mock cookies, for local work and Storybook.
 * `real`: Supabase sessions and the database. Mock cookies and demo accounts are never accepted,
 * and the database path never falls back to the mock store.
 */
export type DataMode = 'mock' | 'real'

export function dataMode(): DataMode {
  return process.env.ROTRA_DATA_MODE === 'real' ? 'real' : 'mock'
}

/** Mock session markers (`@rotra/data/auth/cookie`). Ignored and cleared in real mode. */
export const MOCK_COOKIE_PREFIX = 'rotra-mock-'
