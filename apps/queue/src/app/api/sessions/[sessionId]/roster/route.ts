import {
  addDirectoryPlayerToSession,
  addNewPlayerToSession,
  addSavedPlayerToSession,
  readSessionRoster,
} from '@rotra/db/queue/session-roster'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { phoneField } from '@rotra/schema/phone'
import { cookies } from 'next/headers'

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readSessionRoster(club, sessionId),
  }))
}

/** Add anyway / Add to waitlist on a full roster (#735); only `true` counts. */
const placementOf = (body: Record<string, unknown>) => ({
  allowOverfill: body.allowOverfill === true,
  toWaitlist: body.toWaitlist === true,
})

/**
 * Q-ROSTER › Add player. `source` picks the tab: `saved` (a saved club player), `directory` (a
 * Player Information profile, saved to the club on the way), or a new player (the default; a guest
 * until identity resolves after sync). No identity check: an unclaimed profile is the club's own
 * record (D-2026-11-11-03). `allowOverfill` (Add anyway) and `toWaitlist` (Add to waitlist) are the
 * Queue Master's D-OVERFILL choice on a full roster (#735).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (body.source === 'saved' || body.source === 'directory') {
      const common = {
        operationId: text(body.operationId),
        level: text(body.level),
        ...placementOf(body),
      }
      const entry =
        body.source === 'saved'
          ? await addSavedPlayerToSession(club, sessionId, {
              ...common,
              clubPlayerId: text(body.clubPlayerId),
            })
          : await addDirectoryPlayerToSession(club, sessionId, {
              ...common,
              playerId: text(body.playerId),
            })
      return { status: 201, body: entry }
    }
    const rawPhone = text(body.phone).trim()
    const phone = rawPhone ? phoneField.safeParse(rawPhone) : null
    if (phone && !phone.success)
      throw new ServiceError('invalid', { phone: 'Enter a valid phone number.' })
    const entry = await addNewPlayerToSession(club, sessionId, {
      operationId: text(body.operationId),
      name: text(body.name),
      nickname: text(body.nickname) || undefined,
      phone: phone?.success ? phone.data : undefined,
      level: text(body.level),
      ...placementOf(body),
    })
    return { status: 201, body: entry }
  })
}
