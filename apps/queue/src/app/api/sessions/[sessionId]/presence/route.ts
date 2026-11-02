import { setAllPresence, setPresence } from '@rotra/db/queue/session-roster'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ROSTER › Present. `{ all: boolean }` marks everyone (prepared only); otherwise `changes` lists
 * wanted end states, applied one by one (each is repeat-safe: an unchanged entry is a no-op).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/presence'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (typeof body.all === 'boolean') {
      await setAllPresence(club, sessionId, body.all)
      return { body: { changed: null } }
    }
    const changes = Array.isArray(body.changes) ? (body.changes as Record<string, unknown>[]) : []
    for (const change of changes)
      await setPresence(club, sessionId, {
        rosterId: text(change.rosterId),
        present: change.present === true,
      })
    return { body: { changed: changes.length } }
  })
}
