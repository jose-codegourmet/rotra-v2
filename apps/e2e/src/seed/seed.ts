import { randomBytes, randomUUID } from 'node:crypto'
import { type SeededAccounts, writeAccounts } from '../accounts.ts'
import { anonymous } from '../api/client.ts'
import { signIn } from '../api/sign-in.ts'
import { assertE2eEnv } from '../guard.ts'
import { sql } from '../postgres.ts'
import { e2eEnv } from '../stack.ts'
import {
  ADMIN,
  CLUB,
  PLAYER_COUNT,
  playerEmail,
  playerName,
  playerPhone,
  TEST_PASSWORD,
} from './config.ts'
import { argon2idHash } from './password.ts'
import { ensureRankingPolicy } from './ranking-policy.ts'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Seeds the freshly rebuilt `rotra_disposable_e2e` through the real stack:
 * 1. Admin: a Go sign-in identity (`auth_identities`, argon2id) + its `admin_accounts` row, written as
 *    SQL because no route makes the first admin (the pattern of apps/api/internal/writetest).
 * 2. Club + club login: Admin `POST /api/clubs`, then a license: `POST /api/clubs/:id/licenses`.
 * 3. Players: the club invite code from Queue `GET /api/club/invite`, then Player Information
 *    `POST /api/register/:clubId?k=<code>` per player, which also saves each one to the club.
 */
export async function seed(): Promise<SeededAccounts> {
  assertE2eEnv(e2eEnv())

  const subject = randomUUID()
  const adminId = sql(
    `INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at)
     VALUES (:'subject'::uuid, 'admin', lower(:'login'), :'hash', 'argon2id', now());
     INSERT INTO admin_accounts (id, auth_provider, auth_subject, display_name, updated_at)
     VALUES (gen_random_uuid(), 'rotra', :'subject'::uuid, :'name', now()) RETURNING id`,
    'app',
    { subject, login: ADMIN.email, hash: argon2idHash(TEST_PASSWORD), name: ADMIN.displayName },
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
      nickname: playerName(n),
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
