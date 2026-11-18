import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** The request's cookies, and whether it came over HTTPS (so the held Google cookies are `Secure`). */
export async function googleJar(request: Request) {
  return {
    cookies: routeCookieAdapter(await cookies()),
    secure: new URL(request.url).protocol === 'https:',
  }
}
