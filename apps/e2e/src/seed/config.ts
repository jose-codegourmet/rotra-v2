/**
 * Seed identities. Obviously fake, local-only values: `.test` is a reserved TLD and club logins use
 * the app's own `clubs.rotra.invalid` domain. The password below is a fixed test value for the
 * throwaway local Supabase only; it is never used anywhere else.
 */
export const TEST_PASSWORD = 'rotra-e2e-local-Passw0rd'

/** Auth users on these domains are deleted by `prepare` before each run. */
export const TEST_EMAIL_DOMAINS = ['rotra.test', 'clubs.rotra.invalid']

export const ADMIN = { email: 'e2e-admin@rotra.test', displayName: 'E2E Admin' }

export const CLUB = {
  name: 'E2E Shuttle Club',
  username: 'e2e-club',
  cityCode: 'PH-CEB',
  foundingAddress: '1 Test Street, Cebu City',
  monthlyMinor: 150_000,
  yearlyMinor: 1_500_000,
}

export const PLAYER_COUNT = 12

const pad = (n: number) => String(n).padStart(2, '0')
export const playerEmail = (n: number) => `e2e-player-${pad(n)}@rotra.test`
/** Philippine mobile format the schema accepts; 0917 000 00NN is not a real subscriber here. */
export const playerPhone = (n: number) => `091700000${pad(n)}`
export const playerName = (n: number) => `E2E Player ${pad(n)}`
