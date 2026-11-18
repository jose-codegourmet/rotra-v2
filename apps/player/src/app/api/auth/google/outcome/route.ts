import { peekGoogleReturn, readGoogleOutcome } from '@rotra/db/player/google-sign-in'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { googleJar } from '../googleJar'

/** Is a Google result waiting for a screen on this page? Display values only (#922). */
export async function GET(request: Request) {
  return handleVisitorRequest('player.google-sign-in', async () => ({
    body: await peekGoogleReturn(await googleJar(request)),
  }))
}

/** What the callback decided, read once, in the shapes `useGoogleSignIn` and `useConnectGoogle` return. */
export async function POST(request: Request) {
  return handleVisitorRequest('player.google-sign-in', async () => ({
    body: await readGoogleOutcome(await googleJar(request)),
  }))
}
