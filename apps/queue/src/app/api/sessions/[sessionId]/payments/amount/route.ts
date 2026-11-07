import { setPaymentAmount } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-MONEY › amount received (#479): `{ operationId, clubPlayerId, amountMinor }`, whole centavos,
 * 0 or more; 0 marks the player not paid. Quick switches keep the batch route (#300).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/payments/amount'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setPaymentAmount(club, sessionId, {
        operationId: text(body.operationId),
        clubPlayerId: text(body.clubPlayerId),
        amountMinor: typeof body.amountMinor === 'number' ? body.amountMinor : Number.NaN,
      }),
    }
  })
}
