import { assertLocalSupabaseUrl } from '../guard.ts'
import type { StackKeys } from '../stack.ts'
import { TEST_EMAIL_DOMAINS } from './config.ts'

/** Local Supabase Auth Admin API (GoTrue), with the local service role key. */
async function admin(keys: StackKeys, path: string, init: RequestInit = {}) {
  assertLocalSupabaseUrl(keys.apiUrl)
  const response = await fetch(`${keys.apiUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: keys.serviceRoleKey,
      Authorization: `Bearer ${keys.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  })
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok)
    throw new Error(`[e2e] Supabase admin ${init.method ?? 'GET'} ${path}: ${response.status}`)
  return body ?? {}
}

/** Creates a confirmed email + password user and returns its id (the `auth_subject`). */
export async function createAuthUser(keys: StackKeys, email: string, password: string) {
  const body = await admin(keys, '/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (typeof body.id !== 'string') throw new Error('[e2e] Supabase admin create user: no id')
  return body.id
}

/** Deletes only users whose email is on a test domain; returns how many were deleted. */
export async function deleteTestAuthUsers(keys: StackKeys) {
  const doomed: string[] = []
  for (let page = 1; ; page++) {
    const body = await admin(keys, `/users?page=${page}&per_page=1000`)
    const users = (body.users ?? []) as { id: string; email?: string }[]
    for (const user of users) {
      const email = user.email?.toLowerCase() ?? ''
      if (TEST_EMAIL_DOMAINS.some((domain) => email.endsWith(`@${domain}`))) doomed.push(user.id)
    }
    if (users.length < 1000) break
  }
  for (const id of doomed) await admin(keys, `/users/${id}`, { method: 'DELETE' })
  return doomed.length
}
