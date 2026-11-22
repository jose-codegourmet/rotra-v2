import { findTransferRecipient } from '@rotra/db/queue/slot-transfers'
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
 * Q-PUBLIC-JOIN · **Transfer my slot** › Find (#1011): the recipient by exact RTR ID (name, RTR ID,
 * picture, waitlist place), or the refusal. A POST so the RTR ID never sits in a URL; reads only.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/slot-transfer/lookup'>,
) {
  const { headers, ok } = queueCorsHeaders(request)
  if (!ok) return forbidden(headers)
  // A JSON body forces the CORS preflight, so only the paired Queue origin can send it.
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return forbidden(headers)
  const { slug } = await ctx.params
  const response = await handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => {
      const body = await readJsonBody(request)
      return { body: await findTransferRecipient(player, slug, text(body.rtrId)) }
    },
  )
  return withCors(response, headers)
}
