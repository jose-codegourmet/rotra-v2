import {
  readAdminContactChangeRequests,
  submitContactChangeForPlayer,
} from '@rotra/db/player/contact-change'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A-CONTACT-REQUESTS: every contact-change request with its player; filters run in the client. */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { requests: await readAdminContactChangeRequests(admin) },
  }))
}

/**
 * A-PLAYERS › Edit profile (#564): the owner enters a player's new email. Creates a pending
 * owner-sourced request only; the email changes after review and application, never here.
 * Repeat-safe on `commandId`. The reason goes to the audit event, not the request.
 */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const commandId = text(body.commandId)
    const playerId = text(body.playerId)
    if (!UUID.test(commandId) || !UUID.test(playerId) || body.field !== 'email')
      throw new ServiceError('invalid')
    const created = await submitContactChangeForPlayer(admin, {
      commandId,
      playerId,
      field: 'email',
      value: text(body.value),
      reason: text(body.reason),
    })
    return { status: 201, body: { request: created } }
  })
}
