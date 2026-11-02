import { readSessionPayments, setPaymentMarks } from '@rotra/db/queue/financials'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-MONEY › the Payments checklist; `payments` is null for an invalid session. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/payments'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { payments: await readSessionPayments(club, sessionId) },
  }))
}

/**
 * Q-MONEY › payment switches: `{ operationId, marks: [{ clubPlayerId, paid }] }`, the desired end
 * states of one batch (#300), saved together or not at all.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/payments'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (!Array.isArray(body.marks)) throw new ServiceError('invalid')
    const marks = body.marks.map((mark: unknown) => {
      const value = (mark ?? {}) as Record<string, unknown>
      return { clubPlayerId: text(value.clubPlayerId), paid: value.paid as boolean }
    })
    return {
      body: await setPaymentMarks(club, sessionId, { operationId: text(body.operationId), marks }),
    }
  })
}
