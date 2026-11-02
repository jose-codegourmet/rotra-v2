import { readClubSyncSummary } from '@rotra/db/queue/sync'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Top-bar sync status: prepared/active sessions whose records the server can't prove complete. */
export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: await readClubSyncSummary(club),
  }))
}
