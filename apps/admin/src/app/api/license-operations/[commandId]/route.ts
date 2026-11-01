import { readLicenseOperation } from '@rotra/db/admin/licenses'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** D-LICENSE › Check status after a lost reply. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/license-operations/[commandId]'>,
) {
  const { commandId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { operation: await readLicenseOperation(admin, commandId) },
  }))
}
