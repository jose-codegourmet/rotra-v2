import { readAdminPlayerGames } from '@rotra/db/admin/players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(
  _request: Request,
  context: RouteContext<'/api/players/[playerId]/games'>,
) {
  const { playerId } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { games: await readAdminPlayerGames(admin, playerId) },
  }))
}
