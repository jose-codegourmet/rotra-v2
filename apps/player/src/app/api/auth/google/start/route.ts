import { startPlayerGoogle } from '@rotra/db/player/google-sign-in'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { googleJar } from '../googleJar'

/**
 * Continue with Google, Connect Google, Change (#922): answers the URL to send the browser to. A
 * POST with a JSON body, so another site can't start it. `connect` needs a signed-in player. With
 * `player_google_sign_in` off this is Not found. The redirect URL Supabase must allow is this app's
 * own origin + `/api/auth/google/callback`.
 */
export async function POST(request: Request) {
  return handleVisitorRequest('player.google-sign-in', async () => {
    const body = await readJsonBody(request)
    return {
      body: await startPlayerGoogle(await googleJar(request), {
        intent: body.intent,
        key: body.key,
        returnTo: body.returnTo,
        origin: new URL(request.url).origin,
      }),
    }
  })
}
