import { supabaseProviderAdmin } from '@rotra/db/auth/supabase-provider-admin'
import { checkContactApplication } from '@rotra/db/player/contact-change'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Check status: reads the provider back and settles an approved change; returns the request as
 * it now stands.
 */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/contact-change-requests/[requestId]/check'>,
) {
  const { requestId } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { request: await checkContactApplication(admin, supabaseProviderAdmin(), requestId) },
  }))
}
