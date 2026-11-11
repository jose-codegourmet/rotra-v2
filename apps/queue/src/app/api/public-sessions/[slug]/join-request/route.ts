import { sendJoinRequest } from '@rotra/db/queue/public-session'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { cookies } from 'next/headers'
import { receiptCookie } from '../receipt-cookie'

const optional = (value: unknown) => (typeof value === 'string' ? value : null)

/**
 * Q-PUBLIC-JOIN › Request to join. `requestId` is generated once per open sheet, so a retry with
 * the same fields returns the same request. The receipt goes only in the httpOnly cookie, never
 * in the body; the body is the visitor's own request status.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/join-request'>,
) {
  const { slug } = await ctx.params
  return handleVisitorRequest('public-session.join-request', async () => {
    const body = await readJsonBody(request)
    const { body: mine, receipt } = await sendJoinRequest(slug, {
      requestId: text(body.requestId),
      name: text(body.name),
      nickname: optional(body.nickname),
      phone: optional(body.phone),
      statedBand: text(body.statedBand) as Parameters<typeof sendJoinRequest>[1]['statedBand'],
      // D-2026-11-11-02: Join a slot or Be waitlisted; missing reads slot.
      placement: optional(body.placement) as Parameters<typeof sendJoinRequest>[1]['placement'],
    })
    ;(await cookies()).set(receiptCookie(slug, mine.requestId, receipt))
    return { body: mine }
  })
}
