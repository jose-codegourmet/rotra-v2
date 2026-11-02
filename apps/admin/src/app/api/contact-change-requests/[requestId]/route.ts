import { readAdminContactChangeRequests } from '@rotra/db/player/contact-change'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-CONTACT-REVIEW: one request with its pre-approval checks (only while pending). */
export async function GET(
  _request: Request,
  context: RouteContext<'/api/contact-change-requests/[requestId]'>,
) {
  const { requestId } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const [request] = await readAdminContactChangeRequests(admin, { requestId })
    if (!request) throw new ServiceError('not_found')
    return { body: { request } }
  })
}
