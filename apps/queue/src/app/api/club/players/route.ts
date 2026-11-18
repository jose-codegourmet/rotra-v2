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
 * saves a Player lookup match (with `name` for another club's unclaimed player); otherwise a new
 * player: a guest, or with an email an unclaimed player or a linked registered one (D-2026-11-16-04).
 */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const operationId = text(body.operationId)
    if (body.source === 'directory') {
      const saved = await addDirectoryPlayerToClub(club, {
        operationId,
        playerId: text(body.playerId),
        // This club's own name for another club's unclaimed player (D-2026-11-16-04)
        name: text(body.name) || null,
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
      email: text(body.email) || null,
    })
    return { status: 201, body: saved }
  })
}
