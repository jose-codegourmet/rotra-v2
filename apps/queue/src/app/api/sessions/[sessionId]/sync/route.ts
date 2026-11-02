import { readSyncStatus } from '@rotra/db/queue/sync'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-RECOVERY › the server's device streams, open conflicts (no evidence) and completeness. */
export async function GET(_request: Request, ctx: RouteContext<'/api/sessions/[sessionId]/sync'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readSyncStatus(club, sessionId),
  }))
}
