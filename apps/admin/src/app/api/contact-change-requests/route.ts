import { readAdminContactChangeRequests } from '@rotra/db/player/contact-change'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-CONTACT-REQUESTS: every contact-change request with its player; filters run in the client. */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { requests: await readAdminContactChangeRequests(admin) },
  }))
}
