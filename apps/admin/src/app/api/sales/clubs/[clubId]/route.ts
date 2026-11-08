import { readClubSales } from '@rotra/db/admin/sales'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-CLUB-SALES: one club's last six months against the Admin cost per session. */
export async function GET(_request: Request, ctx: RouteContext<'/api/sales/clubs/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    if (!/^[0-9a-f-]{36}$/i.test(clubId)) throw new ServiceError('not_found')
    const report = await readClubSales(admin, clubId)
    if (!report) throw new ServiceError('not_found')
    return { body: { report } }
  })
}
