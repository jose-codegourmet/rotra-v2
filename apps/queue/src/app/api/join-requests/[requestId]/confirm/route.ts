import { confirmJoinRequest } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-ROSTER › Join requests › Confirm with a level: saves the guest and gives a slot or a waitlist place. */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/join-requests/[requestId]/confirm'>,
) {
  const { requestId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await confirmJoinRequest(club, {
        operationId: text(body.operationId),
        requestId,
        level: text(body.level),
      }),
    }
  })
}
