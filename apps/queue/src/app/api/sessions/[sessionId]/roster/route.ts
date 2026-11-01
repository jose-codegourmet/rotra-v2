import { addNewPlayerToSession, readSessionRoster } from '@rotra/db/queue/session-roster'
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

/** Q-ROSTER › Add a new player (a guest until identity resolves after sync). */
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/sessions/[sessionId]/roster'>,
) {
  const { sessionId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
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
    })
    return { status: 201, body: entry }
  })
}
