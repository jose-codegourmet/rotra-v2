import type { SessionCostInput } from '@rotra/data/session-cost/types'
import { readSessionCost, saveSessionCost } from '@rotra/db/queue/financials'
import {
  type QueueSessionInput,
  readQueueSession,
  setAcceptJoinRequests,
  updateQueueSession,
} from '@rotra/db/queue/session-preparation'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(_request: Request, ctx: RouteContext<'/api/sessions/[sessionId]'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readQueueSession(club, sessionId),
  }))
}

/**
 * `{ acceptJoinRequests }` turns the session link's join requests on or off. `{ commandId,
 * expectedRevision, input }` saves Edit preparation (prepared only, at the displayed revision); when
 * `input.costEstimate` is present the estimate is saved against the one in effect (null deletes it).
 */
export async function PATCH(request: Request, ctx: RouteContext<'/api/sessions/[sessionId]'>) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (typeof body.acceptJoinRequests === 'boolean')
      return { body: await setAcceptJoinRequests(club, sessionId, body.acceptJoinRequests) }
    const commandId = text(body.commandId)
    if (!commandId || !body.input || typeof body.input !== 'object')
      throw new ServiceError('invalid')
    const input = body.input as QueueSessionInput & { costEstimate?: SessionCostInput | null }
    const session = await updateQueueSession(
      club,
      commandId,
      sessionId,
      text(body.expectedRevision),
      input,
    )
    if (input.costEstimate !== undefined) {
      const current = await readSessionCost(club, sessionId)
      await saveSessionCost(club, sessionId, {
        values: input.costEstimate,
        expectedRevision: current?.revision ?? null,
      })
    }
    return { body: session }
  })
}
