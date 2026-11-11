import { readMyAccount, setProfileVisibility } from '@rotra/db/player/profile'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const LEVELS = ['public', 'private', 'always_private'] as const

/** P-PROFILE-PRIVACY · Profile visibility (D-2026-11-12-01), under the account revision the screen loaded. */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const level = LEVELS.find((candidate) => candidate === body.profileVisibility)
    if (!level) throw new ServiceError('invalid')
    await setProfileVisibility(player, {
      profileVisibility: level,
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { account: await readMyAccount(player) } }
  })
}
