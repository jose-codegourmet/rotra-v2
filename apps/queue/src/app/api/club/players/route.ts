import {
  addDirectoryPlayerToClub,
  addNewSavedPlayer,
  listClubPlayers,
} from '@rotra/db/queue/club-players'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { phoneField } from '@rotra/schema/phone'
import { cookies } from 'next/headers'

/** Q-SAVED-PLAYERS: the club's saved players. */
export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { players: await listClubPlayers(club) },
  }))
}

/**
 * Saved players › Add player: saves to the club only, never to a session. `source: 'directory'`
 * saves a Player Information profile; otherwise a new guest or phone-entered player.
 */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const operationId = text(body.operationId)
    if (body.source === 'directory') {
      const saved = await addDirectoryPlayerToClub(club, {
        operationId,
        playerId: text(body.playerId),
      })
      return { status: 201, body: saved }
    }
    const rawPhone = text(body.phone).trim()
    const phone = rawPhone ? phoneField.safeParse(rawPhone) : null
    if (phone && !phone.success)
      throw new ServiceError('invalid', { phone: 'Enter a valid phone number.' })
    const saved = await addNewSavedPlayer(club, {
      operationId,
      name: text(body.name),
      nickname: text(body.nickname) || null,
      phone: phone?.success ? phone.data : null,
    })
    return { status: 201, body: saved }
  })
}
