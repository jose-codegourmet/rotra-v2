import { lookupPlayer } from '@rotra/db/queue/club-players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/**
 * Q-ADD-PLAYER › Player lookup (D-2026-11-16-04): `?q=` an exact RTR ID, an exact email or (#1019, unclaimed players only) an exact social link, over
 * registered and unclaimed people; with no exact match, `matches` lists unclaimed people whose name
 * contains `q` (D-2026-11-23-01). No phone lookup. `players` repeats the one match (or the name
 * matches) as a list for the older search callers.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const found = await lookupPlayer(club, q)
    return { body: { ...found, players: found.player ? [found.player] : (found.matches ?? []) } }
  })
}
