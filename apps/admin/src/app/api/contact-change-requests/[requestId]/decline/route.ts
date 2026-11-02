import { declineContactChange } from '@rotra/db/player/contact-change'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** D-CONTACT › Decline: the player keeps the current contact. Repeat-safe; changes no contact. */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/contact-change-requests/[requestId]/decline'>,
) {
  const { requestId } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { request: await declineContactChange(admin, requestId) },
  }))
}
