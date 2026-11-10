import { handleSignOut } from '@rotra/db/auth/sign-in'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import {
  forbidden,
  preflight,
  queueCorsHeaders,
  withCors,
} from '@/app/api/public-sessions/queueCors'

export const OPTIONS = preflight

/**
 * Q-PUBLIC · **Sign out** in the Queue session page's account bar (#693): the Player app's own
 * sign-out, so the Player is signed out of ROTRA Player on this device too.
 */
export async function POST(request: Request) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const response = await handleSignOut('player', routeCookieAdapter(await cookies()))
  return withCors(response, headers)
}
