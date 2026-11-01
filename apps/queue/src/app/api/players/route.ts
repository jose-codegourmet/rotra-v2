import { searchPlayerDirectory } from '@rotra/db/queue/club-players'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-ADD-PLAYER › Player Information search (`?q=` name, nickname or RTR ID). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { players: await searchPlayerDirectory(club, q) },
  }))
}
