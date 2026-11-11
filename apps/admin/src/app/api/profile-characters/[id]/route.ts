import { profileCharacterIdOfSegment } from '@rotra/data/profile-character/rules'
import {
  deleteProfileCharacter,
  setProfileCharacterShown,
} from '@rotra/db/admin/profile-characters'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-CHARACTERS › click an image: `{ shown }`. Hiding one of only 15 shown images is a conflict. */
export async function PATCH(
  request: Request,
  context: RouteContext<'/api/profile-characters/[id]'>,
) {
  const id = profileCharacterIdOfSegment((await context.params).id)
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    if (typeof body.shown !== 'boolean') throw new ServiceError('invalid')
    return { body: { character: await setProfileCharacterShown(admin, { id, shown: body.shown }) } }
  })
}

/** A-CHARACTERS › x: soft delete; the reply is the deleted image, which Undo restores. */
export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/profile-characters/[id]'>,
) {
  const id = profileCharacterIdOfSegment((await context.params).id)
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { character: await deleteProfileCharacter(admin, id) },
  }))
}
