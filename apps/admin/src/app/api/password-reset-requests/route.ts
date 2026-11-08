import { readPasswordResetRequests } from '@rotra/db/admin/password-resets'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: await readPasswordResetRequests(
      admin,
      Number(new URL(request.url).searchParams.get('page') ?? 1),
    ),
  }))
}
