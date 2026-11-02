import {
  addAutoQueueDrafts,
  addManualMatch,
  addSuggestedMatch,
  autoQueueDraftsOf,
  lineupOf,
  makeMatch,
  readSessionMatches,
} from '@rotra/db/queue/match-queue'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-QUEUE › the session's matches, with the queue and session revisions the screen sends back. */
export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readSessionMatches(club, sessionId),
  }))
}

/**
 * Q-QUEUE › add one waiting match, keyed on the client's `operationId`. `source` picks the
 * command: `selection` (Make match), `suggested` (an accepted suggestion; both revisions it was
 * computed against are required), `auto` (reviewed Auto queue drafts, each keyed on its own
 * `operationId`; both revisions they were checked against are required), or a manual lineup (the
 * default).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/matches'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const operationId = text(body.operationId)
    if (body.source === 'selection') {
      const selection = Array.isArray(body.selection)
        ? body.selection.filter((id): id is string => typeof id === 'string')
        : []
      return { status: 201, body: await makeMatch(club, sessionId, { operationId, selection }) }
    }
    if (body.source === 'auto')
      return {
        status: 201,
        body: await addAutoQueueDrafts(club, sessionId, {
          drafts: autoQueueDraftsOf(body.drafts),
          expectedQueueRevision: text(body.expectedQueueRevision),
          expectedRevision: text(body.expectedRevision),
        }),
      }
    if (body.source === 'suggested')
      return {
        status: 201,
        body: await addSuggestedMatch(club, sessionId, {
          operationId,
          lineup: lineupOf(body.lineup),
          switched: body.switched === true,
          expectedQueueRevision: text(body.expectedQueueRevision),
          expectedRevision: text(body.expectedRevision),
        }),
      }
    return {
      status: 201,
      body: await addManualMatch(club, sessionId, { operationId, lineup: lineupOf(body.lineup) }),
    }
  })
}
