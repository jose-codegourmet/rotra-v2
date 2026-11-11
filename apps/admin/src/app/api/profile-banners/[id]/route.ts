import { deleteProfileBanner, setProfileBannerShown } from '@rotra/db/admin/profile-banners'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-BANNERS › click a banner: `{ shown }`. Hiding one of only 2 shown banners is a conflict. */
export async function PATCH(request: Request, context: RouteContext<'/api/profile-banners/[id]'>) {
  const { id } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    if (typeof body.shown !== 'boolean') throw new ServiceError('invalid')
    return { body: { banner: await setProfileBannerShown(admin, { id, shown: body.shown }) } }
  })
}

/** A-BANNERS › ×: soft delete; the reply is the deleted banner, which Undo restores. */
export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/profile-banners/[id]'>,
) {
  const { id } = await context.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { banner: await deleteProfileBanner(admin, id) },
  }))
}
