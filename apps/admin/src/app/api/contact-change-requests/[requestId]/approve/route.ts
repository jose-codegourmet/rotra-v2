import { supabaseProviderAdmin } from '@rotra/db/auth/supabase-provider-admin'
import { approveContactChange } from '@rotra/db/player/contact-change'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * D-CONTACT › Approve change: review, then apply at the sign-in provider. Returns the request as
 * it now stands (applied, failed or applying).
 */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/contact-change-requests/[requestId]/approve'>,
) {
  const { requestId } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { request: await approveContactChange(admin, supabaseProviderAdmin(), requestId) },
  }))
}
