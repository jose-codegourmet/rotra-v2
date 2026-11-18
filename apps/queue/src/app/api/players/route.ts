import { lookupPlayer } from '@rotra/db/queue/club-players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ADD-PLAYER › Player lookup (D-2026-11-16-04): `?q=` an exact RTR ID or an exact email, over
 * registered and unclaimed people. No name search, no phone lookup. `players` repeats the one match
 * as a list for the older search callers.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const found = await lookupPlayer(club, q)
    return { body: { ...found, players: found.player ? [found.player] : [] } }
  })
}
