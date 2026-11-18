import { readMyAccountVerification } from '@rotra/db/player/account-verification'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: { verification: await readMyAccountVerification(player) },
  }))
}
