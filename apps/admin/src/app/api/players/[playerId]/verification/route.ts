import {
  readAdminAccountVerification,
  setAdminVerificationOverride,
} from '@rotra/db/player/account-verification'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

type Context = RouteContext<'/api/players/[playerId]/verification'>

export async function GET(_request: Request, ctx: Context) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { verification: await readAdminAccountVerification(admin, playerId) },
  }))
}

export async function PATCH(request: Request, ctx: Context) {
  const { playerId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const verification = await setAdminVerificationOverride(admin, {
      playerId,
      revision: text(body.revision),
      verifiedByAdmin: body.verifiedByAdmin,
      reason: text(body.reason),
    })
    return { body: { verification } }
  })
}
