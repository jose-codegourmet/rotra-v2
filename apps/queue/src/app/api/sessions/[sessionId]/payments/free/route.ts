import { setPlayerFree } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-MONEY › Plays free (D-2026-11-27-01): `{ operationId, clubPlayerId, free }`. Setting a paid
 * player free clears their amount received (payments are a guide only).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/payments/free'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setPlayerFree(club, sessionId, {
        operationId: text(body.operationId),
        clubPlayerId: text(body.clubPlayerId),
        free: body.free as boolean,
      }),
    }
  })
}
