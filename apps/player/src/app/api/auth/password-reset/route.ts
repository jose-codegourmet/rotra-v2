import { requestPasswordReset } from '@rotra/db/player/account-access'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-FORGOT: the same acknowledgement for every email. The email links to /reset-password/<hash>. */
export async function POST(request: Request) {
  const redirectTo = `${new URL(request.url).origin}/reset-password`
  return handleVisitorRequest('player.password-reset', async () => {
    const body = await readJsonBody(request)
    return {
      body: await requestPasswordReset(
        routeCookieAdapter(await cookies()),
        text(body.email),
        redirectTo,
      ),
    }
  })
}
