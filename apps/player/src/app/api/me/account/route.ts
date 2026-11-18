import { readMyAccount } from '@rotra/db/player/profile'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** `MyAccount`: the signed-in player's own contacts, phone privacy and profile visibility settings. Private, no-store. */
export async function GET() {
  // Open after the Google deadline too: the connect screen (P-GOOGLE-REQUIRED) shows this account.
  return handleAccountRequest(
    'player',
    routeCookieAdapter(await cookies()),
    async (player) => ({ body: { account: await readMyAccount(player) } }),
    { allowWithoutGoogle: true },
  )
}
