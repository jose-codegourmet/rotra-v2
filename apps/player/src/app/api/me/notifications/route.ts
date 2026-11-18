import {
  listPlayerNotifications,
  markPlayerNotificationsRead,
} from '@rotra/db/player/notifications'
import { requireOwnPlayer } from '@rotra/db/service/authorize'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: { playerId: player.playerId, notifications: await listPlayerNotifications(player) },
  }))
}

export async function PATCH(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    requireOwnPlayer(player, text(body.playerId))
    await markPlayerNotificationsRead(player)
    return { body: { ok: true } }
  })
}
