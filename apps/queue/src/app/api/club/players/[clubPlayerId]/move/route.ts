import { moveSavedPlayer } from '@rotra/db/queue/club-player-move'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Saved players › Edit details › "Same person as NAME?" (D-2026-11-16-04): moves this record into
 * the saved player the typed email already belongs to (`intoClubPlayerId`), hiding it with the
 * `linked_to_club_player_id` redirect.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/club/players/[clubPlayerId]/move'>,
) {
  const { clubPlayerId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await moveSavedPlayer(club, {
        clubPlayerId,
        intoClubPlayerId: text(body.intoClubPlayerId),
        email: text(body.email),
      }),
    }
  })
}
