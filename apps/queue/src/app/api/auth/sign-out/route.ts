import { handleSignOut } from '@rotra/db/auth/sign-in'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const input = ((await request.json().catch(() => null)) ?? {}) as { sessionEnded?: unknown }
  return handleSignOut('club', routeCookieAdapter(await cookies()), input.sessionEnded === true)
}
