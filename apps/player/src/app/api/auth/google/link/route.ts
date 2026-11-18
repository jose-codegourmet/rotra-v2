import { confirmGoogleLink } from '@rotra/db/player/google-sign-in'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { googleJar } from '../googleJar'

/** P-GOOGLE-LINK **Connect Google and sign in** (#922): the player's yes; then they are signed in. */
export async function POST(request: Request) {
  return handleVisitorRequest('player.google-sign-in', async () => {
    const body = await readJsonBody(request)
    return {
      body: await confirmGoogleLink(await googleJar(request), {
        playerId: body.playerId,
        googleEmail: body.googleEmail,
      }),
    }
  })
}
