import { changeClubPassword } from '@rotra/db/auth/club-password'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-CLUB › Change password: checks the current password, then sets the new one. Online only. */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: await changeClubPassword(club, { current: text(body.current), next: text(body.next) }),
    }
  })
}
