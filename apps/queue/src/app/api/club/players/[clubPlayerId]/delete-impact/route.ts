import { readDeleteImpact } from '@rotra/db/queue/club-player-delete'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** What Delete player would affect: the Active Session they're in, and whether they're on court. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/club/players/[clubPlayerId]/delete-impact'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { impact: await readDeleteImpact(club, clubPlayerId) },
  }))
}
