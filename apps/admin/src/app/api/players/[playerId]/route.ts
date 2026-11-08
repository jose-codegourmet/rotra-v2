import { updateAdminPlayerProfile } from '@rotra/db/admin/players'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { adminPlayerEditSchema } from '@rotra/schema/admin-player'
import { cookies } from 'next/headers'

/** A-PLAYER Edit profile under the loaded revision. An email is never saved here (#564). */
export async function PATCH(request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const parsed = adminPlayerEditSchema.omit({ email: true }).safeParse({
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
