import { setClubNickname } from '@rotra/db/queue/club-players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Club nickname sheet › Save nickname (D-2026-11-18-02): this club's own nickname for a registered
 * saved player; an empty `clubNickname` removes it. Queue Master only.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/club/players/[clubPlayerId]/club-nickname'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await setClubNickname(club, { clubPlayerId, clubNickname: text(body.clubNickname) }),
    }
  })
}
