import { markAllPaid } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-MONEY › Mark all paid: `{ operationId }`; every live unpaid roster entry, once. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/payments/mark-all'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return { body: await markAllPaid(club, sessionId, { operationId: text(body.operationId) }) }
  })
}
