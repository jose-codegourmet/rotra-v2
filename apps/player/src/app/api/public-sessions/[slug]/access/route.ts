import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { mockPlayerSessionAccess } from '@rotra/data/public-session/fetchers'
import { dataMode } from '@rotra/db/auth/data-mode'
import { readPlayerSessionAccess } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'
import { forbidden, queueCorsHeaders, withCors } from '@/app/api/public-sessions/queueCors'

/** A credentialed read on the Player origin; its cookie never travels to Queue. */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/access'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { slug } = await ctx.params
  const store = await cookies()
  let response: Response
  if (dataMode() === 'real') {
    response = await handleAccountRequest('player', routeCookieAdapter(store), async (account) => ({
      body: await readPlayerSessionAccess(account, slug),
    }))
  } else {
    // Explicit mock marker only, never accepted by the real account boundary.
    const session = parseMockSession(store.get(mockCookieName('player'))?.value, 'player')
    if (!session) response = Response.json(null, { status: 401 })
    else {
      try {
        response = Response.json(mockPlayerSessionAccess(slug, session.account.id))
      } catch {
        response = Response.json({ error: { code: 'not_found' } }, { status: 404 })
      }
    }
  }
  return withCors(response, headers)
}
