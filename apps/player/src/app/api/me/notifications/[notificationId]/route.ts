import { markPlayerNotificationsRead } from '@rotra/db/player/notifications'
import { requireOwnPlayer } from '@rotra/db/service/authorize'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    requireOwnPlayer(player, text(body.playerId))
    const { notificationId } = await context.params
    await markPlayerNotificationsRead(player, notificationId)
    return { body: { ok: true } }
  })
}
