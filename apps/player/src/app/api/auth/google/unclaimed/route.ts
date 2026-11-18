import { readHeldUnclaimedIdentities } from '@rotra/db/player/google-sign-in'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { googleJar } from '@/app/api/auth/google/googleJar'

/**
 * `getUnclaimedIdentities` (D-2026-11-16-04): the identity cards for the Google account the
 * callback verified and holds (`?email=` must be that account's email). Null when no club saved it.
 */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get('email') ?? ''
  return handleVisitorRequest('player.google-sign-in', async () => ({
    body: { unclaimed: await readHeldUnclaimedIdentities(await googleJar(request), email) },
  }))
}
