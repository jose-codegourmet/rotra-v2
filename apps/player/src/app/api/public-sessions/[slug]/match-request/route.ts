import { readMyMatchRequest, sendMatchRequest } from '@rotra/db/queue/match-requests'
import { handleAccountRequest } from '@rotra/db/service/handler'
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
 * Q-PUBLIC-DETAILS › My night: the signed-in Player's own open match request, `{ matchRequest }`
 * (null when none). A credentialed read on the Player origin, like the access read.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/match-request'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: await readMyMatchRequest(player, slug) }),
  )
  return withCors(response, headers)
}

/**
 * Q-PUBLIC-DETAILS › Request a match › **Send request** (D-2026-11-09-05): `{ requestId, format,
 * partners, opponents }` (roster ids or null for Anyone). 201 `{ matchRequestId, message }`;
 * repeat-safe on `requestId`.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/match-request'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const body = await readJsonBody(request)
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({
      status: 201,
      body: await sendMatchRequest(player, slug, {
        requestId: text(body.requestId),
        format: body.format,
        partners: body.partners,
        opponents: body.opponents,
      }),
    }),
  )
  return withCors(response, headers)
}
