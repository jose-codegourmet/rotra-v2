import { driveFinalizationJobs } from '@rotra/db/player/projections'
import { finalizeSession, readFinalizationStatus } from '@rotra/db/queue/finalization'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Job work never fails the reply: the commit (or the read) stands, the jobs keep their own status
 * and the next status read runs them again.
 */
function stillPending(error: unknown) {
  console.error(
    '[finalization] in-request jobs',
    error instanceof Error ? error.name : typeof error,
  )
  return []
}

/**
 * Q-FINALIZE-PROGRESS › status after a lost response, recovered by session. While the committed
 * finalization still has jobs outstanding, this read also runs them (the interim in-request
 * worker, #243), so a request lost after commit still finishes. Not found until one committed.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/finalization'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    await driveFinalizationJobs(club, sessionId).catch(stillPending)
    return { body: await readFinalizationStatus(club, sessionId) }
  })
}

/**
 * Q-DONE › Session done, keyed on `commandId` (one per open sheet). The commit happens once under
 * the session lock with the proposed #246 barriers; a retry or a second command returns the
 * committed status. Then this request drives the session's projection and slide jobs (interim
 * in-request worker, #243); a retry also makes this session's failed jobs due again.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/finalization'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const commandId = text(body.commandId)
    if (!UUID.test(commandId))
      throw new ServiceError('invalid', { commandId: 'A confirmation ID is required.' })
    const committed = await finalizeSession(club, sessionId, { commandId })
    // A first commit has no failed jobs, so this only matters for Try again.
    await driveFinalizationJobs(club, sessionId, { retryFailed: true }).catch(stillPending)
    return {
      body: {
        status: await readFinalizationStatus(club, sessionId),
        warnings: committed?.warnings ?? { belowMinimum: [] },
      },
    }
  })
}
