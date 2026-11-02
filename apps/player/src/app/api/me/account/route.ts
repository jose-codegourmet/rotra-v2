import { readMyAccount } from '@rotra/db/player/profile'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** `MyAccount`: the signed-in player's own contacts and phone privacy. Private, no-store. */
export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: { account: await readMyAccount(player) },
  }))
}
