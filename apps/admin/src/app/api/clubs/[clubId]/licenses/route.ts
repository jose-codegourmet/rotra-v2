import { activateLicense } from '@rotra/db/admin/licenses'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * D-LICENSE › Activate/Renew license. The server decides the start (when current access ends, or
 * now); the typed reference is kept as the term's note (both proposals, #245; gap logged).
 */
export async function POST(request: Request, ctx: RouteContext<'/api/clubs/[clubId]/licenses'>) {
  const { clubId } = await ctx.params
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const term = await activateLicense(admin, {
      commandId: text(body.sourceCommandId),
      clubId,
      plan: body.plan === 'Yearly' ? 'yearly' : body.plan === 'Monthly' ? 'monthly' : ('' as never),
      amountMinor: int(body.amountMinor),
      paidOn: typeof body.paidOn === 'string' ? body.paidOn : null,
      notes: text(body.reference),
    })
    return { status: 201, body: { term } }
  })
}
