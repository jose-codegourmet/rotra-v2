import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { clubLoginEmail } from '../admin/club-identity'
import { prisma } from '../client/prisma'
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
