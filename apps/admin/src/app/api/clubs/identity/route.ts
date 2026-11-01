import { readClubIdentityIndex } from '@rotra/db/admin/clubs'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: await readClubIdentityIndex(admin),
  }))
}
