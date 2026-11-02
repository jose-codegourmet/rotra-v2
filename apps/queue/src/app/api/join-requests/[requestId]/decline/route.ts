import { declineJoinRequest } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-ROSTER › Join requests › Decline. */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/join-requests/[requestId]/decline'>,
) {
  const { requestId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { request: await declineJoinRequest(club, { requestId }) },
  }))
}
