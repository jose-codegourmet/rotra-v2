import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { clubLoginEmail } from '../admin/club-identity'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { type ProviderAdmin, ProviderError } from './provider-admin'

/** `auth.users.raw_app_meta_data` key that ties a login to the staged operation that created it. */
const OPERATION_KEY = 'rotra_operation_ref'

function adminClient(timeoutMs?: number) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new ProviderError('provider_unavailable')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(timeoutMs
      ? {
          global: {
            fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
          },
        }
      : {}),
  })
}

function failure(status: number | undefined): ProviderError {
  if (status === 422 || status === 400) return new ProviderError('provider_rejected')
  return new ProviderError('provider_unavailable')
}

/**
 * Supabase Auth admin adapter for `ProviderAdmin`. PROPOSAL under #243/#244. Server-only: the secret
 * key never leaves this module. A club login is a confirmed email user (see `clubLoginEmail`); a
 * repeated create for the same operation finds the login it already made instead of a second one.
 */
export function supabaseProviderAdmin(): ProviderAdmin {
  return {
    async createLogin(input) {
      const email = input.username ? clubLoginEmail(input.username) : input.email
      if (!email || !input.initialPassword) throw new ProviderError('provider_rejected')
      const { data, error } = await adminClient().auth.admin.createUser({
        email,
        password: input.initialPassword,
        email_confirm: true,
        app_metadata: { [OPERATION_KEY]: input.operationRef },
      })
      if (data.user) return { subject: data.user.id }
      if (error?.code !== 'email_exists') throw failure(error?.status)
      const rows = await prisma.$queryRaw<{ id: string; ref: string | null }[]>`
        SELECT "id"::text AS "id", "raw_app_meta_data" ->> ${OPERATION_KEY} AS "ref"
        FROM "auth"."users" WHERE lower("email") = lower(${email})`
      const existing = rows[0]
      if (!existing || existing.ref !== input.operationRef)
        throw new ProviderError('provider_conflict')
      return { subject: existing.id }
    },
    async readLogin(subject) {
      const { data, error } = await adminClient().auth.admin.getUserById(subject)
      if (error?.status === 404) return null
      if (error || !data.user) throw failure(error?.status)
      return {
        email: data.user.email ?? null,
        phoneE164: data.user.phone ? `+${data.user.phone}` : null,
      }
    },
    async updateLogin(input) {
      const { error } = await adminClient().auth.admin.updateUserById(input.subject, {
        ...(input.email ? { email: input.email, email_confirm: true } : {}),
        ...(input.phoneE164 ? { phone: input.phoneE164, phone_confirm: true } : {}),
      })
      if (error) throw failure(error.status)
    },
  }
}

/** Server-only recovery issuance. generateLink does not deliver email. Never log its response. */
export async function generatePlayerRecoveryToken(subject: string, email: string) {
  const client = adminClient(15000)
  const current = await client.auth.admin.getUserById(subject)
  if (current.error || !current.data.user) throw failure(current.error?.status)
  if (current.data.user.email?.toLowerCase() !== email) throw new ProviderError('provider_conflict')
  const { data, error } = await client.auth.admin.generateLink({ type: 'recovery', email })
  if (error || !data.properties?.hashed_token) throw failure(error?.status)
  if (data.user.id !== subject) throw new ProviderError('provider_conflict')
  return data.properties.hashed_token
}

/** Server-only beta Admin password change; a timeout leaves the outcome unconfirmed. */
export async function setPlayerPasswordByAdmin(subject: string, password: string) {
  if (password.length < 8) throw new ProviderError('provider_rejected')
  const { data, error } = await adminClient(15000).auth.admin.updateUserById(subject, { password })
  if (error || data.user?.id !== subject) throw failure(error?.status)
}

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Whether a login has a password (`MyAccount.hasPassword`, Forgot password for a Google account).
 * Read from the provider's own row; an account made by Google registration or a Google claim has
 * none. A missing login reads as no password.
 */
export async function loginHasPassword(subject: string, db: Db = prisma) {
  const rows = await db.$queryRaw<{ present: boolean }[]>`
    SELECT COALESCE("encrypted_password", '') <> '' AS "present"
    FROM "auth"."users" WHERE "id" = ${subject}::uuid`
  return rows[0]?.present === true
}

/** Whether a login other than `subject` (a player's, a club's or Admin's) already uses this email. */
export async function emailHasOtherLogin(email: string, subject: string) {
  const rows = await prisma.$queryRaw<{ present: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM "auth"."users" WHERE lower("email") = ${email} AND "id" <> ${subject}::uuid
    ) AS "present"`
  return rows[0]?.present === true
}

/** Whether any ROTRA account (player, club or Admin) is mapped to this login. */
export async function loginHasRotraAccount(subject: string, db: Db = prisma) {
  const where = { authProvider: 'supabase', authSubject: subject }
  const player = await db.playerAccount.findUnique({
    where: { authProvider_authSubject: where },
    select: { playerId: true },
  })
  const club = await db.clubAccount.findUnique({
    where: { authProvider_authSubject: where },
    select: { clubId: true },
  })
  const admin = await db.adminAccount.findUnique({
    where: { authProvider_authSubject: where },
    select: { id: true },
  })
  return Boolean(player || club || admin)
}

/** The advisory lock both the orphan cleanup and a Google registration or claim take on a login. */
export const googleLoginLockKey = (subject: string) => `google-login:${subject}`

/**
 * Removes the login Supabase made by itself for a Google account that has no ROTRA account (a
 * Google sign-in on `/login` never creates a player, D-2026-11-16-01). Deleted only when all of
 * these hold, each read fresh here: no player, club or Admin account is mapped to it, and the
 * provider's own record shows nothing but Google sign-in methods on it and no password (so it was
 * never a password login). Anything else is left untouched. It runs under the same lock a Google
 * registration or claim takes before mapping the login (`claim.ts`), so the two can't cross.
 * Best effort: a failure leaves a login that maps to no account and so can't act as anyone.
 * Returns whether it was deleted.
 */
export async function deleteOrphanGoogleLogin(subject: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${googleLoginLockKey(subject)}))`
        if (await loginHasRotraAccount(subject, tx)) return false
        const client = adminClient(10000)
        const { data, error } = await client.auth.admin.getUserById(subject)
        const identities = data.user?.identities ?? []
        if (error || !data.user || !identities.length) return false
        if (identities.some((identity) => identity.provider !== 'google')) return false
        if (await loginHasPassword(subject, tx)) return false
        const removed = await client.auth.admin.deleteUser(subject)
        return !removed.error
      },
      { timeout: 30000 },
    )
  } catch {
    return false
  }
}
