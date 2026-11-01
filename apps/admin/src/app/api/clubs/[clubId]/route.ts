import { readAdminClubDirectory } from '@rotra/db/admin/clubs'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(_request: Request, ctx: RouteContext<'/api/clubs/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    if (!/^[0-9a-f-]{36}$/i.test(clubId)) throw new ServiceError('not_found')
    const [club] = await readAdminClubDirectory(admin, clubId)
    if (!club) throw new ServiceError('not_found')
    return { body: { club } }
  })
}
