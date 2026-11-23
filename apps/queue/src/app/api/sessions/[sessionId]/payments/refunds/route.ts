import { recordSessionRefund } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Cancelled record › Refund everyone who paid › **Record refund** (#1014):
 * `{ sessionPlayerId, expectedAmountMinor }`. One append-only manual full refund per player of a
 * cancelled session (ROTRA moves no money); a retry returns the refund already recorded. 409 when
 * the session is not cancelled, there is no cash to refund, or the amount no longer matches.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/payments/refunds'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await recordSessionRefund(club, sessionId, {
        sessionPlayerId: body.sessionPlayerId,
        expectedAmountMinor: body.expectedAmountMinor,
      }),
    }
  })
}
