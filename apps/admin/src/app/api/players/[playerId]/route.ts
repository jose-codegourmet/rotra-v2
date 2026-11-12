import { updateAdminPlayerProfile } from '@rotra/db/admin/players'
import { readPublicProfile } from '@rotra/db/player/profile'
import { requireAdmin } from '@rotra/db/service/authorize'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { adminPlayerProfilePatchSchema } from '@rotra/schema/admin-player'
import { cookies } from 'next/headers'

/** Admin Quick view reads the profile under the Admin account boundary. */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    requireAdmin(admin)
    const profile = await readPublicProfile(playerId, true)
    return { body: { socialLinks: profile.socialLinks } }
  })
}

/** A-PLAYER Edit profile under the loaded revision. An email is never saved here (#564). */
export async function PATCH(request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const parsed = adminPlayerProfilePatchSchema.safeParse({
      name: text(body.name),
      nickname: text(body.nickname),
      picture: text(body.picture),
      reason: text(body.reason),
    })
    if (!parsed.success)
      throw new ServiceError(
        'invalid',
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path.at(-1)), issue.message]),
        ),
      )
    const player = await updateAdminPlayerProfile(admin, {
      playerId,
      expectedRevision: text(body.revision),
      ...parsed.data,
    })
    return { body: { player } }
  })
}
