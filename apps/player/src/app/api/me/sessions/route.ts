import { readMySessions } from '@rotra/db/player/my-sessions'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-OWN-PROFILE · My sessions: the signed-in player's open and finished sessions. Private. */
export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: await readMySessions(player),
  }))
}
