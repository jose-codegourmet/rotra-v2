import { setFeatureFlag } from '@rotra/db/admin/configuration'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** D-FLAG › Turn on / Turn off under `expectedRevision`; a stale revision is a conflict. */
export async function PATCH(request: Request, context: RouteContext<'/api/feature-flags/[key]'>) {
  const { key } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    if (typeof body.on !== 'boolean') throw new ServiceError('invalid')
    const flag = await setFeatureFlag(admin, {
      key,
      value: body.on,
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { flag } }
  })
}
