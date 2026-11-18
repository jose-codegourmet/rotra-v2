import { createAdminPlayer } from '@rotra/db/admin/player-create'
import { readAdminPlayerDirectory } from '@rotra/db/admin/players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { players: await readAdminPlayerDirectory(admin) },
  }))
}

/** A-PLAYERS Add player: saves the club's unclaimed record; the RTR ID comes at registration. */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { player: await createAdminPlayer(admin, await readJsonBody(request)) },
  }))
}
