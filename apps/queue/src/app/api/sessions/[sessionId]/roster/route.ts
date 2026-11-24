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

/**
 * Add anyway / Add to waitlist on a full roster (#735), and the Queue Master's second press after
 * the level restriction warning (`allowOutsideLevels`, D-2026-11-19-12); only `true` counts.
 */
const placementOf = (body: Record<string, unknown>) => ({
  allowOverfill: body.allowOverfill === true,
  toWaitlist: body.toWaitlist === true,
  allowOutsideLevels: body.allowOutsideLevels === true,
})

/**
 * Q-ROSTER › Add player. `source` picks the tab: `saved` (a saved club player), `directory` (a
 * Player lookup match, saved to the club on the way; `name` is this club's own name for another
 * club's unclaimed player), or a new player (the default; no email adds a guest, an email adds an
 * unclaimed player or links a registered one, D-2026-11-16-04). `allowOverfill` (Add anyway) and `toWaitlist` (Add to waitlist) are the
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
              // This club's own name for another club's unclaimed player (D-2026-11-16-04)
              name: text(body.name) || null,
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
      email: text(body.email) || null,
      socialLink: text(body.socialLink) || null,
      clubPlayerId: text(body.clubPlayerId) || null,
      level: text(body.level),
      ...placementOf(body),
    })
    return { status: 201, body: entry }
  })
}
