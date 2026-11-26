import { readMyAccount, setMyGender } from '@rotra/db/player/profile'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * P-EDIT-PROFILE › Name › Gender: `{ gender: 'male' | 'female' | null, expectedRevision }` under the
 * account revision the screen loaded (D-2026-11-19-01). The player's own gender only.
 */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const gender = body.gender
    if (gender !== null && gender !== 'male' && gender !== 'female')
      throw new ServiceError('invalid', { gender: 'Choose Male or Female.' })
    const profile = await setMyGender(player, {
      gender,
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { profile, revision: (await readMyAccount(player)).revision } }
  })
}
