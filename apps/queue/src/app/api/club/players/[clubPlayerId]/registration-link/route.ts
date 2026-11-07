import { issueClaimLink } from '@rotra/db/player/claim'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-SAVED-PLAYERS › Invite (unclaimed profile). Issues a 7-day, single-use registration link and
 * revokes the player's earlier one. The plaintext token is returned once and never stored.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<'/api/club/players/[clubPlayerId]/registration-link'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await issueClaimLink(club, clubPlayerId),
  }))
}
