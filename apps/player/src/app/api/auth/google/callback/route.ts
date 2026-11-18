import { googleSignInEnabled, handleGoogleCallback } from '@rotra/db/player/google-sign-in'
import { googleJar } from '../googleJar'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * Where Google (through Supabase Auth) sends the browser back (#922). It decides the outcome on the
 * server, keeps it in short-lived httpOnly cookies and redirects to the screen that started the
 * trip; no email, code or token is ever put in the redirect. With `player_google_sign_in` off (or
 * in mock mode) it is Not found, like a route that doesn't exist.
 */
export async function GET(request: Request) {
  if (!(await googleSignInEnabled())) return new Response(null, { status: 404, headers: NO_STORE })
  const url = new URL(request.url)
  let path = '/login'
  try {
    path = await handleGoogleCallback(await googleJar(request), {
      code: url.searchParams.get('code'),
      errorCode: url.searchParams.get('error_code'),
      errorDescription: url.searchParams.get('error_description'),
    })
  } catch (error) {
    console.error('[google-sign-in] callback', error instanceof Error ? error.name : typeof error)
  }
  return new Response(null, {
    status: 303,
    headers: { ...NO_STORE, Location: new URL(path, url.origin).toString() },
  })
}
