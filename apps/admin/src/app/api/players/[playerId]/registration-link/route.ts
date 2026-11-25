import { issueAdminClaimLink } from '@rotra/db/player/claim'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * A-PLAYERS › Copy registration link, issued as ROTRA Admin: 7 days, single use, revokes the
 * player's earlier link. The plaintext token is returned once and never stored.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/players/[playerId]/registration-link'>,
) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: await issueAdminClaimLink(admin, playerId),
  }))
}
