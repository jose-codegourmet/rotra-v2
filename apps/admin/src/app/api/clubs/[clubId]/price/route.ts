import { readAdminClubDirectory, setClubPricing } from '@rotra/db/admin/clubs'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * A-CLUB-PRICE › Save price. Later payments start from the new price; recorded license terms keep
 * their amounts. A repeat of the same command ID returns the club it already changed.
 */
export async function PATCH(request: Request, ctx: RouteContext<'/api/clubs/[clubId]/price'>) {
  const { clubId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    if (!/^[0-9a-f-]{36}$/i.test(clubId)) throw new ServiceError('not_found')
    const body = await readJsonBody(request)
    const price = (body.price ?? {}) as Record<string, unknown>
    await setClubPricing(admin, {
      commandId: text(body.sourceCommandId),
      clubId,
      expectedRevision: text(body.expectedRevision),
      pricing:
        price.pricing === 'free'
          ? { pricing: 'free' }
          : { pricing: 'paid', monthlyMinor: int(price.monthly), yearlyMinor: int(price.yearly) },
    })
    const [club] = await readAdminClubDirectory(admin, clubId)
    if (!club) throw new ServiceError('not_found')
    return { body: { club } }
  })
}
