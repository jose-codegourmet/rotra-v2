import { profileCharacterIdOfSegment } from '@rotra/data/profile-character/rules'
import { profileCharacterImageResponse } from '@rotra/db/admin/profile-characters'

/** A `character:<id>` picture's image, hidden and deleted library images included. Public. */
export async function GET(
  _request: Request,
  context: RouteContext<'/api/profile-characters/[id]/image'>,
) {
  const id = profileCharacterIdOfSegment((await context.params).id)
  return profileCharacterImageResponse(id)
}
