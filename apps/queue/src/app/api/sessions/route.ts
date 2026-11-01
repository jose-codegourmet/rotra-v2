import type { SessionCostInput } from '@rotra/data/session-cost/types'
import { saveSessionCost } from '@rotra/db/queue/financials'
import {
  createQueueSession,
  type QueueSessionInput,
  readQueueSessions,
} from '@rotra/db/queue/session-preparation'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { sessions: await readQueueSessions(club) },
  }))
}

/**
 * Q-SETUP › Create session (or a repeating series), then its cost estimate on every created date.
 * Repeat-safe on `commandId`: a retry returns the same sessions, and an estimate already saved by
 * the earlier attempt is kept (its conflict is the repeat), never written twice.
 */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const commandId = text(body.commandId)
    if (!commandId) throw new ServiceError('invalid')
    const input = body.input as QueueSessionInput & { costEstimate?: SessionCostInput | null }
    const created = await createQueueSession(club, commandId, input)
    if (input.costEstimate) {
      const sessions = await readQueueSessions(club)
      const first = sessions.find((s) => s.session.id === created.firstSessionId)
      const ids = sessions
        .filter((s) =>
          first?.session.seriesId
            ? s.session.seriesId === first.session.seriesId
            : s.session.id === created.firstSessionId,
        )
        .map((s) => s.session.id)
      for (const id of ids)
        await saveSessionCost(club, id, {
          values: input.costEstimate,
          expectedRevision: null,
        }).catch((error: unknown) => {
          if (!(error instanceof ServiceError && error.code === 'conflict')) throw error
        })
    }
    return { status: 201, body: created }
  })
}
