import { profileCharacterIdOfSegment } from '@rotra/data/profile-character/rules'
import { restoreProfileCharacter } from '@rotra/db/admin/profile-characters'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Undo of a delete: the image comes back in its old place; already back is a conflict. */
export async function POST(
  _request: Request,
  context: RouteContext<'/api/profile-characters/[id]/restore'>,
) {
  const id = profileCharacterIdOfSegment((await context.params).id)
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { character: await restoreProfileCharacter(admin, id) },
  }))
}
