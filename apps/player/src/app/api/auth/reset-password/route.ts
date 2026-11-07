import { resetPassword } from '@rotra/db/player/account-access'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** P-RESET: uses the single-use recovery token, sets the new password, leaves the player signed out. */
export async function POST(request: Request) {
  return handleVisitorRequest('player.password-reset', async () => {
    const body = await readJsonBody(request)
    return {
      body: await resetPassword(
        routeCookieAdapter(await cookies()),
        text(body.token),
        text(body.password),
      ),
    }
  })
}
