import { readMyAccount, setStatsVisibility } from '@rotra/db/player/profile'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const flag = (value: unknown) => {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new ServiceError('invalid')
  return value
}

/**
 * P-PROFILE-PRIVACY · Stats on your profile: `{ showProfileStats?, showWeeklyPerformance?,
 * expectedRevision }`, at least one switch, under the account revision the screen loaded.
 */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const showProfileStats = flag(body.showProfileStats)
    const showWeeklyPerformance = flag(body.showWeeklyPerformance)
    if (showProfileStats === undefined && showWeeklyPerformance === undefined)
      throw new ServiceError('invalid')
    const profile = await setStatsVisibility(player, {
      showProfileStats,
      showWeeklyPerformance,
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { profile, revision: (await readMyAccount(player)).revision } }
  })
}
