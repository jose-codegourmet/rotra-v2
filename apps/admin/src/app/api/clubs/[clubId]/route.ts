import { readAdminClubDirectory, reviewClubNameChange } from '@rotra/db/admin/clubs'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
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

export async function PATCH(request: Request, ctx: RouteContext<'/api/clubs/[clubId]'>) {
  const { clubId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    if (!/^[0-9a-f-]{36}$/i.test(clubId)) throw new ServiceError('not_found')
    const body = await readJsonBody(request)
    const requestId = text(body.requestId)
    const decision = text(body.decision)
    if (decision !== 'approved' && decision !== 'rejected') throw new ServiceError('invalid')
    const [club] = await readAdminClubDirectory(admin, clubId)
    if (!club || club.pendingNameRequest?.id !== requestId) throw new ServiceError('conflict')
    await reviewClubNameChange(admin, { requestId, decision })
    return {
      body: {
        changed: true,
        name: decision === 'approved' ? club.pendingNameRequest.requestedName : club.name,
      },
    }
  })
}
