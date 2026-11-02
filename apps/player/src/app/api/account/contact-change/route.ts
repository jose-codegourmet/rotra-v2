import { readOwnContactChanges, submitOwnContactChange } from '@rotra/db/player/contact-change'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** P-ACCOUNT: the signed-in player's latest contact-change request, or null. Their own only. */
export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: { request: (await readOwnContactChanges(player))[0] ?? null },
  }))
}

/**
 * P-CONTACT-REQUEST › Send for review. Creates a pending request only: the login contact changes
 * after Admin approval and application, never here. Repeat-safe on `commandId`.
 */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const commandId = text(body.commandId)
    const field = body.field
    if (!UUID.test(commandId) || (field !== 'phone' && field !== 'email'))
      throw new ServiceError('invalid')
    const created = await submitOwnContactChange(player, {
      commandId,
      field,
      value: text(body.value),
    })
    return { status: 201, body: { request: created } }
  })
}
