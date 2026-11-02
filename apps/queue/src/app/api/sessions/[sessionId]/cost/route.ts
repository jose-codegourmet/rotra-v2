import { readSessionCost } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-SETUP, Q-PREPARE, Q-RECORD › the saved cost estimate, derived at read time in centavos.
 * `input` is null when no estimate is saved ("No fee set").
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/cost'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { cost: await readSessionCost(club, sessionId) },
  }))
}
