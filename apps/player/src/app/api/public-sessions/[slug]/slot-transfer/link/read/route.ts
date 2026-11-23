import { optionalPlayerId } from '@rotra/db/player/club-page'
import { readTransferLink } from '@rotra/db/queue/slot-transfers'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
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
 * Q-PUBLIC-JOIN · **Transfer link** card (#1012) for `/s/<slug>?transfer=<token>`: anyone holding
 * the link reads its state (open, claimed, closed, expired, cancelled) and the sender's masked name;
 * a signed-in viewer also learns whether it is theirs (own, yours, approved). A POST so the token
 * never sits in a server log URL. Private and never cached.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/slot-transfer/link/read'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleVisitorRequest('public-session.transfer-link', async () => {
    const body = await readJsonBody(request)
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    return { body: await readTransferLink(viewerId, slug, text(body.token)) }
  })
  return withCors(response, headers)
}
