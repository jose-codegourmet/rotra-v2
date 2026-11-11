import { joinMyClub, readMyClubs } from '@rotra/db/player/my-clubs'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-OWN-PROFILE · Your clubs: the signed-in player's current clubs. Private, no-store. */
export async function GET() {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => ({
    body: { clubs: await readMyClubs(player) },
  }))
}

/** Join club from a club link, for the signed-in player only. */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    return { body: await joinMyClub(player, text(body.clubId)) }
  })
}
