import { confirmJoinRequest } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ROSTER › Join requests › Confirm with a level: saves the guest and gives a slot or a waitlist
 * place. A slot outside the session's level restriction is refused with the reason unless
 * `allowOutsideLevels` is true (Confirm again after the warning, D-2026-11-19-12).
 */
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
        allowOutsideLevels: body.allowOutsideLevels === true,
      }),
    }
  })
}
