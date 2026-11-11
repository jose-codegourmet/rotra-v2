import { restoreProfileBanner } from '@rotra/db/admin/profile-banners'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Undo of a delete: the banner comes back in its old place; already back is a conflict. */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/profile-banners/[id]/restore'>,
) {
  const { id } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { banner: await restoreProfileBanner(admin, id) },
  }))
}
