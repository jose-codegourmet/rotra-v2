import { readSessionResults } from '@rotra/db/queue/results'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-RESULTS › the private snapshot and current publication; null for an invalid session. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/results'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readSessionResults(club, sessionId),
  }))
}
