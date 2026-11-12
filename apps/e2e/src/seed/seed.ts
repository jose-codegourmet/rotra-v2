import { execFileSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { type SeededAccounts, writeAccounts } from '../accounts.ts'
import { anonymous } from '../api/client.ts'
import { signIn } from '../api/sign-in.ts'
import { assertE2eEnv, assertLocalDbUrl } from '../guard.ts'
import { E2E_DB_URL, e2eEnv, psqlPath, readStackKeys } from '../stack.ts'
import { createAuthUser } from './auth-admin.ts'
import {
  ADMIN,
  CLUB,
  PLAYER_COUNT,
  playerEmail,
  playerName,
  playerPhone,
  TEST_PASSWORD,
} from './config.ts'
import { ensureRankingPolicy } from './ranking-policy.ts'

/** Runs one SQL statement on the e2e app database and returns the first column of the first row. */
function sql(statement: string, vars: Record<string, string>) {
  assertLocalDbUrl('DATABASE_URL', E2E_DB_URL)
  const args = [E2E_DB_URL, '-v', 'ON_ERROR_STOP=1', '-qtA']
  for (const [key, value] of Object.entries(vars)) args.push('-v', `${key}=${value}`)
  return execFileSync(psqlPath(), args, { input: statement, encoding: 'utf8' }).trim()
}

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Seeds the freshly rebuilt `rotra_disposable_e2e` through the real stack:
 * 1. Admin: a Supabase Auth user (Admin API) + its `admin_accounts` row (SQL; there is no route).
 * 2. Club + club login: Admin `POST /api/clubs`, then a license: `POST /api/clubs/:id/licenses`.
 * 3. Players: the club invite code from Queue `GET /api/club/invite`, then Player Information
 *    `POST /api/register/:clubId?k=<code>` per player, which also saves each one to the club.
 */
export async function seed(): Promise<SeededAccounts> {
  const keys = readStackKeys()
  assertE2eEnv(e2eEnv(keys))

  const subject = await createAuthUser(keys, ADMIN.email, TEST_PASSWORD)
  const adminId = sql(
    `INSERT INTO admin_accounts (id, auth_provider, auth_subject, display_name, updated_at)
     VALUES (gen_random_uuid(), 'supabase', :'subject'::uuid, :'name', now()) RETURNING id`,
    { subject, name: ADMIN.displayName },
  )

  const admin = await signIn('admin', ADMIN.email, TEST_PASSWORD)
  await ensureRankingPolicy(admin)
  const club = await admin.post<{ clubId: string; name: string }>('/api/clubs', {
    sourceCommandId: randomUUID(),
    name: CLUB.name,
    cityCode: CLUB.cityCode,
    foundingAddress: CLUB.foundingAddress,
    username: CLUB.username,
    password: TEST_PASSWORD,
    price: { pricing: 'paid', monthly: CLUB.monthlyMinor, yearly: CLUB.yearlyMinor },
  })
  await admin.post(`/api/clubs/${club.clubId}/licenses`, {
    sourceCommandId: randomUUID(),
    plan: 'Monthly',
    amountMinor: CLUB.monthlyMinor,
    paidOn: today(),
    reference: 'E2E seed',
  })
  await admin.dispose()

  const queue = await signIn('queue', CLUB.username, TEST_PASSWORD)
  const { inviteCode } = await queue.get<{ inviteCode: string }>('/api/club/invite')
  await queue.dispose()

  const players: SeededAccounts['players'] = []
  for (let n = 1; n <= PLAYER_COUNT; n++) {
    const visitor = await anonymous('player')
    const values = {
      fullName: playerName(n),
      nickname: '',
      playingStyle: '',
      experienceYears: '',
      experienceMonths: '',
      facebook: '',
      instagram: '',
      youtube: '',
      linkedin: '',
      email: playerEmail(n),
      phone: playerPhone(n),
      password: TEST_PASSWORD,
    }
    const result = await visitor.post<{ status: string; playerId?: string }>(
      `/api/register/${club.clubId}?k=${encodeURIComponent(inviteCode)}`,
      { attempt: randomBytes(32).toString('hex'), values },
    )
    await visitor.dispose()
    if (result.status !== 'registered' || !result.playerId)
      throw new Error(`[e2e] Registering player ${n} returned ${result.status}.`)
    players.push({
      n,
      email: values.email,
      password: TEST_PASSWORD,
      phone: values.phone,
      fullName: values.fullName,
      playerId: result.playerId,
    })
  }

  const accounts: SeededAccounts = {
    admin: { email: ADMIN.email, password: TEST_PASSWORD, adminId },
    club: {
      clubId: club.clubId,
      name: club.name,
      username: CLUB.username,
      password: TEST_PASSWORD,
      inviteCode,
    },
    players,
  }
  writeAccounts(accounts)
  return accounts
}
