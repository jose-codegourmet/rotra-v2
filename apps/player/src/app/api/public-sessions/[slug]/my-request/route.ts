import { readMyJoinRequest } from '@rotra/db/queue/public-session'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { cookies } from 'next/headers'
import { parseReceiptCookie, RECEIPT_COOKIE } from '../receipt-cookie'

/**
 * Q-PUBLIC › My request: this browser's own request on the slug, or null when it holds no
 * receipt. A receipt that no longer matches (another slug, an unknown ID) also reads as null.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/my-request'>,
) {
  const { slug } = await ctx.params
  return handleVisitorRequest('public-session.my-request', async () => {
    const held = parseReceiptCookie((await cookies()).get(RECEIPT_COOKIE)?.value)
    if (!held) return { body: null }
    try {
      return { body: await readMyJoinRequest(slug, held.requestId, held.receipt) }
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'not_found') return { body: null }
      throw error
    }
  })
}
