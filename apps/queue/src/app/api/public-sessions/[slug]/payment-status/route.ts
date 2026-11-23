import { readPublicPaymentStatus } from '@rotra/db/queue/financials'
import { handlePublicRead } from '@rotra/db/service/handler'

/**
 * Q-PUBLIC-DETAILS › Share payment status (#1010): the confirmed roster's masked names with the
 * amount received, and the amount due. No account. `paymentStatus` is null for a cancelled or
 * invalid session; an unknown or removed slug is `not_found`.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/public-sessions/[slug]/payment-status'>,
) {
  const { slug } = await ctx.params
  return handlePublicRead('public-session.payment-status', async () => ({
    body: { paymentStatus: await readPublicPaymentStatus(slug) },
  }))
}
