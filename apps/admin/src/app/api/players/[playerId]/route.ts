import { saveAdminPlayer } from '@rotra/db/admin/player-edit'
import { readAdminPlayerEdit } from '@rotra/db/admin/players'
import { requireAdmin } from '@rotra/db/service/authorize'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import { cookies } from 'next/headers'

/** Admin Quick view reads the profile under the Admin account boundary. */
export async function GET(_request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    requireAdmin(admin)
    const edit = await readAdminPlayerEdit(admin, playerId)
    return { body: { edit, socialLinks: edit.socialLinks } }
  })
}

/** A-PLAYER Edit: validate and save the full form under the loaded revision. */
export async function PATCH(request: Request, ctx: RouteContext<'/api/players/[playerId]'>) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const result = await saveAdminPlayer(admin, {
      playerId,
      revision: text(body.revision),
      values: body.values as AdminPlayerEditValues,
    })
    return { body: result }
  })
}
