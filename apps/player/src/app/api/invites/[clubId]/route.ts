import { optionalPlayerId } from '@rotra/db/player/club-page'
import { googleSignInEnabled } from '@rotra/db/player/google-sign-in'
import { readInviteLanding } from '@rotra/db/player/invite-landing'
import { ServiceError } from '@rotra/db/service/errors'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-INVITE (#922): the invite card for a club link (`?k=<code>`) or a session link
 * (`?session=<slug>`), and where a signed-in viewer stands. Private and never cached. Not found
 * while `player_google_sign_in` is off.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/invites/[clubId]'>) {
  const { clubId } = await ctx.params
  const search = new URL(request.url).searchParams
  return handleVisitorRequest('player.invite-landing', async () => {
    if (!(await googleSignInEnabled())) throw new ServiceError('not_found')
    const viewerId = await optionalPlayerId(routeCookieAdapter(await cookies()))
    return {
      body: await readInviteLanding(
        {
          clubId,
          sessionSlug: search.get('session') || null,
          clubInviteCode: search.get('k') || null,
        },
        viewerId,
      ),
    }
  })
}
