import { readAccounts } from '../accounts.ts'
import type { AppName } from '../stack.ts'
import { type AppClient, anonymous } from './client.ts'

/** POST /api/auth/sign-in `{ identifier, password }` on one app; the cookies stay in the client. */
export async function signIn(app: AppName, identifier: string, password: string) {
  const client = await anonymous(app)
  await client.post('/api/auth/sign-in', { identifier, password })
  return client
}

/** The seeded platform owner on Admin (9102). */
export function asAdmin(): Promise<AppClient> {
  const { admin } = readAccounts()
  return signIn('admin', admin.email, admin.password)
}

/** The seeded club account (Queue Master) on Queue (9100); signs in with the club username. */
export function asQueueMaster(): Promise<AppClient> {
  const { club } = readAccounts()
  return signIn('queue', club.username, club.password)
}

/** Seeded player `n` (1-based, e2e-player-NN@rotra.test) on Player Information (9101). */
export function asPlayer(n: number): Promise<AppClient> {
  const player = readAccounts().players.find((entry) => entry.n === n)
  if (!player) throw new Error(`[e2e] No seeded player ${n}.`)
  return signIn('player', player.email, player.password)
}
