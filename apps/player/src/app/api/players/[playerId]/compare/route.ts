import { readPlayerCompare } from '@rotra/db/player/compare'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-COMPARE is account-only even though its allowlisted numbers are public on profiles. */
export async function GET(request: Request, ctx: RouteContext<'/api/players/[playerId]/compare'>) {
  const { playerId } = await ctx.params
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const params = new URL(request.url).searchParams
    const filter = params.get('filter') ?? 'all'
    const rawPage = params.get('page') ?? '0'
    if (!['all', 'h2h', 'together'].includes(filter) || !/^\d+$/.test(rawPage))
      throw new ServiceError('invalid')
    const page = Number(rawPage)
    if (!Number.isSafeInteger(page)) throw new ServiceError('invalid')
    return {
      body: {
        compare: await readPlayerCompare(player, playerId, {
          filter: filter as 'all' | 'h2h' | 'together',
          page,
        }),
      },
    }
  })
}
