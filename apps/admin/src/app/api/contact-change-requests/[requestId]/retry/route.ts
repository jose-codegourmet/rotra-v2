import { supabaseProviderAdmin } from '@rotra/db/auth/supabase-provider-admin'
import { retryContactApplication } from '@rotra/db/player/contact-change'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Retry application: the same request and provider operation ref go back to applying. Only a
 * failed application is retried.
 */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/contact-change-requests/[requestId]/retry'>,
) {
  const { requestId } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { request: await retryContactApplication(admin, supabaseProviderAdmin(), requestId) },
  }))
}
