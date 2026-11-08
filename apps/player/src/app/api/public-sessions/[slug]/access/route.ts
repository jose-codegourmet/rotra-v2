import { mockCookieName, parseMockSession } from '@rotra/data/auth/cookie'
import { PLAYER_ORIGINS, QUEUE_ORIGINS } from '@rotra/data/public-session/context'
import { mockPlayerSessionAccess } from '@rotra/data/public-session/fetchers'
import { dataMode } from '@rotra/db/auth/data-mode'
import { readPlayerSessionAccess } from '@rotra/db/queue/public-session'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A credentialed read on the Player origin; its cookie never travels to Queue. */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/access'>,
) {
  const origin = request.headers.get('Origin')
  const pair = origin ? QUEUE_ORIGINS.indexOf(origin) : -1
  const headers = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Origin, Cookie' })
  if (pair < 0 || new URL(request.url).origin !== PLAYER_ORIGINS[pair])
    return Response.json({ error: { code: 'forbidden' } }, { status: 403, headers })
  headers.set('Access-Control-Allow-Origin', origin as string)
  headers.set('Access-Control-Allow-Credentials', 'true')
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
  for (const [key, value] of headers) response.headers.set(key, value)
  return response
}
