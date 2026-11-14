import { setDefaultProfileBanner } from '@rotra/db/admin/profile-banners'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Make default (D-2026-11-13-03): `{ banner, previousId }`, so Undo can put the old default back. */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/profile-banners/[id]/default'>,
) {
  const { id } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: await setDefaultProfileBanner(admin, id),
  }))
}
