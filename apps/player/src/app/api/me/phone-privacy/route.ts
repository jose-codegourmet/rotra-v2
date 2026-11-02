import { readMyAccount, setPhonePrivacy } from '@rotra/db/player/profile'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-PHONE-PRIVACY · Hide my phone from clubs, under the account revision the screen loaded. */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    if (typeof body.phoneHidden !== 'boolean') throw new ServiceError('invalid')
    await setPhonePrivacy(player, {
      phoneHidden: body.phoneHidden,
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { account: await readMyAccount(player) } }
  })
}
