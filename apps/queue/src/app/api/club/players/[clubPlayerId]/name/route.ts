import { renameClubPlayer } from '@rotra/db/queue/club-player-details'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Edit player › Save changes (D-2026-11-26-07): the full name and the one nickname of a guest or
 * unclaimed player this club made; an empty `nickname` removes it. A registered player is refused.
 * Queue Master only.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<'/api/club/players/[clubPlayerId]/name'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await renameClubPlayer(club, {
        clubPlayerId,
        fullName: text(body.fullName),
        nickname: text(body.nickname) || null,
      }),
    }
  })
}
