import { readOwnLicense } from '@rotra/db/admin/licenses'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-ACCESS gate and Q-CLUB License: allowed after expiry so the club can see its own state. */
export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { license: await readOwnLicense(club) },
  }))
}
