import { readMyAccount, setMyProfileBanner } from '@rotra/db/player/profile'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Edit profile › Name › Banner: `{ bannerId, expectedRevision }`; only a shown banner can be picked. */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const bannerId = text(body.bannerId)
    if (!bannerId) throw new ServiceError('invalid')
    const profile = await setMyProfileBanner(player, {
      bannerId,
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { profile, revision: (await readMyAccount(player)).revision } }
  })
}
