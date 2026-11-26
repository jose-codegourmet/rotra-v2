import { cancelClubNameChange, requestClubNameChange } from '@rotra/db/admin/clubs'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-CLUB › Request name change. One pending request per club; repeat-safe on `commandId`. */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const commandId = text(body.commandId)
    if (!commandId) throw new ServiceError('invalid', { commandId: 'Reload and try again.' })
    return {
      body: { request: await requestClubNameChange(club, { commandId, name: text(body.name) }) },
    }
  })
}

/** Cancels the club's own pending name-change request (pending becomes cancelled). */
export async function DELETE() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await cancelClubNameChange(club),
  }))
}
